"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'
import type { Task, NewTask, UpdateTask, User } from '@/types/database'

interface TaskContextType {
  tasks: Task[]
  bartenders: User[]
  isLoading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  fetchBartenders: () => Promise<void>
  createTask: (task: NewTask) => Promise<Task | null>
  updateTask: (id: string, updates: UpdateTask) => Promise<boolean>
  completeTask: (id: string) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  getTasksForUser: (userId: string) => Task[]
  getTasksForDate: (date: Date) => Task[]
  getOverdueTasks: () => Task[]
  getStats: (userId?: string) => TaskStats
}

export interface TaskStats {
  total: number
  completed: number
  pending: number
  overdue: number
  inProgress: number
  averageCompletionTime: number | null
  completionRate: number
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

// Демо данные для разработки
const demoTasks: Task[] = [
  {
    id: '1',
    title: 'Подготовить барную станцию',
    description: 'Проверить наличие всех ингредиентов и инструментов',
    action_type: 'task',
    task_type: 'prepare',
    status: 'pending',
    due_date: new Date(Date.now() + 3600000).toISOString(),
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Инвентаризация алкоголя',
    description: 'Пересчитать остатки крепкого алкоголя',
    action_type: 'task',
    task_type: 'inventory',
    status: 'in_progress',
    due_date: new Date(Date.now() + 7200000).toISOString(),
    assigned_to: 'bartender-2',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Проверить срок годности сиропов',
    description: null,
    action_type: 'task',
    task_type: 'check',
    status: 'completed',
    due_date: new Date(Date.now() - 3600000).toISOString(),
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: new Date(Date.now() - 1800000).toISOString(),
    file_url: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '4',
    title: 'Новое меню коктейлей',
    description: 'Ознакомьтесь с обновлённым меню на эту неделю',
    action_type: 'note',
    task_type: null,
    status: 'pending',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const demoBartenders: User[] = [
  {
    id: 'bartender-1',
    telegram_id: 111111111,
    username: 'ivan_barman',
    first_name: 'Иван',
    last_name: 'Петров',
    photo_url: null,
    role: 'bartender',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bartender-2',
    telegram_id: 222222222,
    username: 'maria_bar',
    first_name: 'Мария',
    last_name: 'Сидорова',
    photo_url: null,
    role: 'bartender',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'bartender-3',
    telegram_id: 333333333,
    username: 'alex_mix',
    first_name: 'Алексей',
    last_name: 'Козлов',
    photo_url: null,
    role: 'bartender',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(demoTasks)
  const [bartenders, setBartenders] = useState<User[]>(demoBartenders)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, isAdmin } = useAuth()
  
  // Проверяем наличие Supabase
  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

  const fetchTasks = useCallback(async () => {
    if (!user) return
    if (!hasSupabase) return // Используем демо данные
    
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase.from('tasks').select('*')

      // Админ видит все задачи, бармен только свои
      if (!isAdmin) {
        query = query.eq('assigned_to', user.id)
      }

      const { data, error: fetchError } = await query.order('due_date', { ascending: true })

      if (fetchError) {
        console.warn('Using demo tasks:', fetchError.message)
        return
      }

      if (data) {
        setTasks(data)
      }
    } catch (err) {
      console.error('Fetch tasks error:', err)
      setError('Ошибка загрузки задач')
    } finally {
      setIsLoading(false)
    }
  }, [user, isAdmin, hasSupabase])

  const fetchBartenders = useCallback(async () => {
    if (!isAdmin) return
    if (!hasSupabase) return // Используем демо данные

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'bartender')
        .order('first_name')

      if (fetchError) {
        console.warn('Using demo bartenders:', fetchError.message)
        return
      }

      if (data) {
        setBartenders(data)
      }
    } catch (err) {
      console.error('Fetch bartenders error:', err)
    }
  }, [isAdmin, hasSupabase])

  const createTask = useCallback(async (newTask: NewTask): Promise<Task | null> => {
    if (!user) return null

    try {
      const taskData = {
        ...newTask,
        created_by: user.id,
      }

      // Демо режим - создаём локально
      if (!hasSupabase) {
        const demoTask: Task = {
          id: `demo-${Date.now()}`,
          ...taskData,
          status: 'pending',
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setTasks(prev => [...prev, demoTask])
        return demoTask
      }

      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (insertError) {
        // Демо режим - создаём локально
        const demoTask: Task = {
          id: `demo-${Date.now()}`,
          ...taskData,
          status: 'pending',
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setTasks(prev => [...prev, demoTask])
        return demoTask
      }

      if (data) {
        setTasks(prev => [...prev, data])
        return data
      }

      return null
    } catch (err) {
      console.error('Create task error:', err)
      setError('Ошибка создания задачи')
      return null
    }
  }, [user, hasSupabase])

  const updateTask = useCallback(async (id: string, updates: UpdateTask): Promise<boolean> => {
    try {
      // Всегда обновляем локально
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ))

      if (!hasSupabase) return true

      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) {
        console.warn('Update error (demo mode):', updateError.message)
      }

      return true
    } catch (err) {
      console.error('Update task error:', err)
      setError('Ошибка обновления задачи')
      return false
    }
  }, [hasSupabase])

  const completeTask = useCallback(async (id: string): Promise<boolean> => {
    return updateTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  }, [updateTask])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Всегда удаляем локально
      setTasks(prev => prev.filter(t => t.id !== id))

      if (!hasSupabase) return true

      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.warn('Delete error (demo mode):', deleteError.message)
      }

      return true
    } catch (err) {
      console.error('Delete task error:', err)
      setError('Ошибка удаления задачи')
      return false
    }
  }, [hasSupabase])

  const getTasksForUser = useCallback((userId: string): Task[] => {
    return tasks.filter(t => t.assigned_to === userId)
  }, [tasks])

  const getTasksForDate = useCallback((date: Date): Task[] => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return tasks.filter(t => {
      const taskDate = new Date(t.due_date)
      return taskDate >= startOfDay && taskDate <= endOfDay
    })
  }, [tasks])

  const getOverdueTasks = useCallback((): Task[] => {
    const now = new Date()
    return tasks.filter(t => 
      new Date(t.due_date) < now && 
      t.status !== 'completed'
    )
  }, [tasks])

  const getStats = useCallback((userId?: string): TaskStats => {
    const filteredTasks = userId 
      ? tasks.filter(t => t.assigned_to === userId)
      : tasks

    const completed = filteredTasks.filter(t => t.status === 'completed')
    const pending = filteredTasks.filter(t => t.status === 'pending')
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress')
    const overdue = filteredTasks.filter(t => 
      new Date(t.due_date) < new Date() && t.status !== 'completed'
    )

    // Среднее время выполнения (в минутах)
    const completionTimes = completed
      .filter(t => t.completed_at)
      .map(t => {
        const created = new Date(t.created_at).getTime()
        const completedAt = new Date(t.completed_at!).getTime()
        return (completedAt - created) / 60000
      })

    const averageCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : null

    const completionRate = filteredTasks.length > 0
      ? Math.round((completed.length / filteredTasks.length) * 100)
      : 0

    return {
      total: filteredTasks.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      inProgress: inProgress.length,
      averageCompletionTime,
      completionRate,
    }
  }, [tasks])

  useEffect(() => {
    if (user) {
      fetchTasks()
      if (isAdmin) {
        fetchBartenders()
      }
    }
  }, [user, isAdmin, fetchTasks, fetchBartenders])

  const value: TaskContextType = {
    tasks,
    bartenders,
    isLoading,
    error,
    fetchTasks,
    fetchBartenders,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    getTasksForUser,
    getTasksForDate,
    getOverdueTasks,
    getStats,
  }

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider')
  }
  return context
}

