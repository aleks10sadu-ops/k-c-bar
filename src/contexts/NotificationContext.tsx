"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import type { Task, User } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  type: 'task_created' | 'task_completed' | 'task_updated' | 'task_assigned'
  title: string
  message: string
  taskId?: string
  fromUser?: string
  fromUserName?: string
  createdAt: string
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Проверяем наличие Supabase
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAdmin } = useAuth()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const usersMapRef = useRef<Map<string, User>>(new Map())

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Храним максимум 50 уведомлений
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Загружаем информацию о пользователях для отображения имён
  const loadUsers = useCallback(async () => {
    if (!hasSupabase) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase.from('users').select('*')
      
      if (data) {
        usersMapRef.current = new Map(data.map(u => [u.id, u]))
      }
    } catch (err) {
      console.error('Failed to load users for notifications:', err)
    }
  }, [])

  const getUserName = useCallback((userId: string): string => {
    const user = usersMapRef.current.get(userId)
    if (user) {
      return `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    }
    return 'Пользователь'
  }, [])

  // Подписка на realtime изменения
  useEffect(() => {
    if (!user || !hasSupabase) return

    let mounted = true

    const setupRealtimeNotifications = async () => {
      await loadUsers()
      
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          (payload) => {
            if (!mounted) return

            const task = payload.new as Task
            const oldTask = payload.old as Task | null

            // Для бармена - только уведомления о его задачах
            if (!isAdmin) {
              if (payload.eventType === 'INSERT' && task.assigned_to === user.id) {
                const creatorName = getUserName(task.created_by)
                addNotification({
                  type: 'task_created',
                  title: 'Новая задача',
                  message: `${creatorName} назначил вам задачу: "${task.title}"`,
                  taskId: task.id,
                  fromUser: task.created_by,
                  fromUserName: creatorName,
                })
              } else if (payload.eventType === 'UPDATE' && task.assigned_to === user.id) {
                if (oldTask && oldTask.status !== task.status) {
                  addNotification({
                    type: 'task_updated',
                    title: 'Задача обновлена',
                    message: `Статус задачи "${task.title}" изменён`,
                    taskId: task.id,
                  })
                }
              }
            } 
            // Для админа - уведомления о выполненных задачах
            else {
              if (payload.eventType === 'UPDATE' && task.status === 'completed' && oldTask?.status !== 'completed') {
                const bartenderName = getUserName(task.assigned_to)
                addNotification({
                  type: 'task_completed',
                  title: 'Задача выполнена',
                  message: `${bartenderName} выполнил(а) задачу: "${task.title}"`,
                  taskId: task.id,
                  fromUser: task.assigned_to,
                  fromUserName: bartenderName,
                })
              } else if (payload.eventType === 'UPDATE' && task.status === 'in_progress' && oldTask?.status === 'pending') {
                const bartenderName = getUserName(task.assigned_to)
                addNotification({
                  type: 'task_updated',
                  title: 'Задача в работе',
                  message: `${bartenderName} начал(а) выполнять: "${task.title}"`,
                  taskId: task.id,
                  fromUser: task.assigned_to,
                  fromUserName: bartenderName,
                })
              }
            }
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    setupRealtimeNotifications()

    return () => {
      mounted = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [user, isAdmin, addNotification, loadUsers, getUserName])

  const unreadCount = notifications.filter(n => !n.read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
    addNotification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

