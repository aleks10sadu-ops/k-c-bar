"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import type { Task, User, Notification as DbNotification, NewNotification, NotificationType } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  taskId?: string
  fromUserId?: string
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
  openTaskFromNotification: (taskId: string) => void
  pendingTaskId: string | null
  clearPendingTask: () => void
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
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const { user, isAdmin } = useAuth()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const notifChannelRef = useRef<RealtimeChannel | null>(null)
  const usersMapRef = useRef<Map<string, User>>(new Map())

  const openTaskFromNotification = useCallback((taskId: string) => {
    setPendingTaskId(taskId)
    setIsOpen(false) // Закрываем панель уведомлений
  }, [])

  const clearPendingTask = useCallback(() => {
    setPendingTaskId(null)
  }, [])

  // Преобразуем DB Notification в локальный формат
  const dbToLocal = useCallback((dbNotif: DbNotification): Notification => {
    const fromUser = usersMapRef.current.get(dbNotif.from_user_id || '')
    return {
      id: dbNotif.id,
      type: dbNotif.type,
      title: dbNotif.title,
      message: dbNotif.message,
      taskId: dbNotif.task_id || undefined,
      fromUserId: dbNotif.from_user_id || undefined,
      fromUserName: fromUser ? `${fromUser.first_name}${fromUser.last_name ? ' ' + fromUser.last_name : ''}` : undefined,
      createdAt: dbNotif.created_at,
      read: dbNotif.read,
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))

    if (hasSupabase) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase
          .from('notifications')
          .update({ read: true } as never)
          .eq('id', id)
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

    if (hasSupabase && user) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase
          .from('notifications')
          .update({ read: true } as never)
          .eq('user_id', user.id)
          .eq('read', false)
      } catch (err) {
        console.error('Failed to mark all notifications as read:', err)
      }
    }
  }, [user])

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
        const users = data as User[]
        usersMapRef.current = new Map(users.map(u => [u.id, u]))
      }
    } catch (err) {
      console.error('Failed to load users for notifications:', err)
    }
  }, [])

  // Загружаем существующие уведомления
  const loadNotifications = useCallback(async () => {
    if (!hasSupabase || !user) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.warn('Failed to load notifications:', error.message)
        return
      }

      if (data) {
        const dbNotifications = data as DbNotification[]
        setNotifications(dbNotifications.map(dbToLocal))
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }, [user, dbToLocal])

  const getUserName = useCallback((userId: string): string => {
    const user = usersMapRef.current.get(userId)
    if (user) {
      return `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    }
    return 'Пользователь'
  }, [])

  // Создаём уведомление в БД и отправляем в Telegram
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    taskId?: string,
    fromUserId?: string
  ) => {
    if (!hasSupabase) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const newNotif: NewNotification = {
        user_id: userId,
        type,
        title,
        message,
        task_id: taskId || null,
        from_user_id: fromUserId || null,
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(newNotif as never)
        .select()
        .single()

      if (error) {
        console.error('Failed to create notification:', error)
        return
      }

      // Отправляем уведомление в Telegram
      if (data) {
        const notifData = data as DbNotification
        await sendTelegramNotification(userId, message)
        
        // Обновляем флаг sent_to_telegram
        await supabase
          .from('notifications')
          .update({ sent_to_telegram: true } as never)
          .eq('id', notifData.id)
      }
    } catch (err) {
      console.error('Failed to create notification:', err)
    }
  }, [])

  // Отправляем уведомление через Telegram бота
  const sendTelegramNotification = async (userId: string, message: string) => {
    try {
      const response = await fetch('/api/notifications/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message }),
      })

      if (!response.ok) {
        console.warn('Failed to send Telegram notification')
      }
    } catch (err) {
      console.error('Telegram notification error:', err)
    }
  }

  // Подписка на realtime изменения
  useEffect(() => {
    if (!user || !hasSupabase) return

    let mounted = true

    const setupRealtimeNotifications = async () => {
      await loadUsers()
      await loadNotifications()
      
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Подписка на новые уведомления для текущего пользователя
      const notifChannel = supabase
        .channel('my-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            
            const newNotif = payload.new as DbNotification
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotif.id)) return prev
              return [dbToLocal(newNotif), ...prev].slice(0, 50)
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return
            
            const updatedNotif = payload.new as DbNotification
            setNotifications(prev => prev.map(n => 
              n.id === updatedNotif.id ? dbToLocal(updatedNotif) : n
            ))
          }
        )
        .subscribe()

      notifChannelRef.current = notifChannel

      // Подписка на изменения задач для создания уведомлений
      const channel = supabase
        .channel('task-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          async (payload) => {
            if (!mounted) return

            const task = payload.new as Task
            const oldTask = payload.old as Task | null

            // Для бармена - уведомления о новых задачах
            if (!isAdmin) {
              if (payload.eventType === 'INSERT' && task.assigned_to === user.id) {
                const creatorName = getUserName(task.created_by)
                await createNotification(
                  user.id,
                  'task_created',
                  'Новая задача',
                  `${creatorName} назначил вам задачу: "${task.title}"`,
                  task.id,
                  task.created_by
                )
              }
            } 
            // Для админа - уведомления о выполненных задачах
            else {
              if (payload.eventType === 'UPDATE' && task.status === 'completed' && oldTask?.status !== 'completed') {
                const bartenderName = getUserName(task.assigned_to)
                await createNotification(
                  user.id,
                  'task_completed',
                  'Задача выполнена',
                  `${bartenderName} выполнил(а) задачу: "${task.title}"`,
                  task.id,
                  task.assigned_to
                )
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
      if (notifChannelRef.current) {
        notifChannelRef.current.unsubscribe()
        notifChannelRef.current = null
      }
    }
  }, [user, isAdmin, loadUsers, loadNotifications, getUserName, createNotification, dbToLocal])

  const unreadCount = notifications.filter(n => !n.read).length

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
    openTaskFromNotification,
    pendingTaskId,
    clearPendingTask,
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
