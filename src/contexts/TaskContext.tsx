"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import type { Task, NewTask, UpdateTask, User, TaskStatus } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

// Проверяем наличие Supabase
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Демо данные для разработки
const demoTasks: Task[] = [
  {
    id: '1',
    title: 'Подготовить барную станцию',
    description: null,
    action_type: 'task',
    task_type: 'prepare',
    status: 'pending',
    due_date: new Date(Date.now() + 3600000).toISOString(),
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: ['Проверить лёд', 'Подготовить гарниры', 'Разложить инструменты'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Инвентаризация алкоголя',
    description: null,
    action_type: 'task',
    task_type: 'inventory',
    status: 'in_progress',
    due_date: new Date(Date.now() + 7200000).toISOString(),
    assigned_to: 'bartender-2',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: ['Пересчитать виски', 'Пересчитать ром', 'Записать в журнал'],
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
    steps: ['Проверить все сиропы', 'Отметить просроченные'],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '4',
    title: 'Примечание',
    description: 'Ознакомьтесь с обновлённым меню коктейлей на эту неделю',
    action_type: 'note',
    task_type: null,
    status: 'pending',
    due_date: null,
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: null,
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

// Хелпер для создания полного Task объекта из NewTask
function createTaskFromNew(newTask: NewTask, userId: string): Task {
  const now = new Date().toISOString()
  return {
    id: `demo-${Date.now()}`,
    title: newTask.title,
    description: newTask.description ?? null,
    action_type: newTask.action_type,
    task_type: newTask.task_type ?? null,
    status: (newTask.status ?? 'pending') as TaskStatus,
    steps: newTask.steps ?? null,
    due_date: newTask.due_date ?? null,
    assigned_to: newTask.assigned_to,
    created_by: userId,
    completed_at: newTask.completed_at ?? null,
    file_url: newTask.file_url ?? null,
    created_at: newTask.created_at ?? now,
    updated_at: newTask.updated_at ?? now,
  }
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(demoTasks)
  const [bartenders, setBartenders] = useState<User[]>(demoBartenders)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, isAdmin } = useAuth()
  
  // Ref для хранения подписок realtime
  const tasksChannelRef = useRef<RealtimeChannel | null>(null)
  const usersChannelRef = useRef<RealtimeChannel | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    if (!hasSupabase) return // Используем демо данные
    
    setIsLoading(true)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
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
  }, [user, isAdmin])

  const fetchBartenders = useCallback(async () => {
    if (!isAdmin) return
    if (!hasSupabase) return // Используем демо данные

    try {
      const { createClient } = await import('@/lib/supabase/client')
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
  }, [isAdmin])

  // Настройка realtime подписок
  useEffect(() => {
    if (!user || !hasSupabase) return

    let mounted = true

    const setupRealtimeSubscriptions = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // Подписка на изменения задач
        const tasksChannel = supabase
          .channel('tasks-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
            },
            (payload) => {
              if (!mounted) return
              
              console.log('Tasks realtime update:', payload.eventType)

              if (payload.eventType === 'INSERT') {
                const newTask = payload.new as Task
                // Для бармена - добавляем только если задача назначена ему
                if (isAdmin || newTask.assigned_to === user.id) {
                  setTasks(prev => {
                    // Проверяем, нет ли уже такой задачи
                    if (prev.some(t => t.id === newTask.id)) return prev
                    return [...prev, newTask]
                  })
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedTask = payload.new as Task
                setTasks(prev => prev.map(t => 
                  t.id === updatedTask.id ? updatedTask : t
                ))
              } else if (payload.eventType === 'DELETE') {
                const deletedTask = payload.old as { id: string }
                setTasks(prev => prev.filter(t => t.id !== deletedTask.id))
              }
            }
          )
          .subscribe()

        tasksChannelRef.current = tasksChannel

        // Подписка на изменения пользователей (для админа)
        if (isAdmin) {
          const usersChannel = supabase
            .channel('users-changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: 'role=eq.bartender',
              },
              (payload) => {
                if (!mounted) return
                
                console.log('Users realtime update:', payload.eventType)

                if (payload.eventType === 'INSERT') {
                  const newUser = payload.new as User
                  setBartenders(prev => {
                    if (prev.some(u => u.id === newUser.id)) return prev
                    return [...prev, newUser]
                  })
                } else if (payload.eventType === 'UPDATE') {
                  const updatedUser = payload.new as User
                  setBartenders(prev => prev.map(u => 
                    u.id === updatedUser.id ? updatedUser : u
                  ))
                } else if (payload.eventType === 'DELETE') {
                  const deletedUser = payload.old as { id: string }
                  setBartenders(prev => prev.filter(u => u.id !== deletedUser.id))
                }
              }
            )
            .subscribe()

          usersChannelRef.current = usersChannel
        }
      } catch (err) {
        console.error('Realtime subscription error:', err)
      }
    }

    setupRealtimeSubscriptions()

    // Cleanup при размонтировании
    return () => {
      mounted = false
      
      if (tasksChannelRef.current) {
        tasksChannelRef.current.unsubscribe()
        tasksChannelRef.current = null
      }
      if (usersChannelRef.current) {
        usersChannelRef.current.unsubscribe()
        usersChannelRef.current = null
      }
    }
  }, [user, isAdmin])

  const createTask = useCallback(async (newTask: NewTask): Promise<Task | null> => {
    if (!user) return null

    try {
      // Демо режим - создаём локально
      if (!hasSupabase) {
        const demoTask = createTaskFromNew(newTask, user.id)
        setTasks(prev => [...prev, demoTask])
        return demoTask
      }

      const taskData = {
        title: newTask.title,
        description: newTask.description ?? null,
        action_type: newTask.action_type,
        task_type: newTask.task_type ?? null,
        due_date: newTask.due_date,
        assigned_to: newTask.assigned_to,
        created_by: user.id,
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(taskData as never)
        .select()
        .single()

      if (insertError) {
        console.warn('Insert error, using demo mode:', insertError.message)
        // Fallback к демо режиму
        const demoTask = createTaskFromNew(newTask, user.id)
        setTasks(prev => [...prev, demoTask])
        return demoTask
      }

      // Не добавляем вручную - realtime подписка сделает это
      return data
    } catch (err) {
      console.error('Create task error:', err)
      setError('Ошибка создания задачи')
      return null
    }
  }, [user])

  const updateTask = useCallback(async (id: string, updates: UpdateTask): Promise<boolean> => {
    try {
      // Оптимистичное обновление для мгновенного UI отклика
      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ))

      if (!hasSupabase) return true

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)

      if (updateError) {
        console.warn('Update error:', updateError.message)
        // Откатываем оптимистичное обновление при ошибке
        await fetchTasks()
        return false
      }

      return true
    } catch (err) {
      console.error('Update task error:', err)
      setError('Ошибка обновления задачи')
      return false
    }
  }, [fetchTasks])

  const completeTask = useCallback(async (id: string): Promise<boolean> => {
    return updateTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  }, [updateTask])

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Оптимистичное удаление
      setTasks(prev => prev.filter(t => t.id !== id))

      if (!hasSupabase) return true

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.warn('Delete error:', deleteError.message)
        // Откатываем при ошибке
        await fetchTasks()
        return false
      }

      return true
    } catch (err) {
      console.error('Delete task error:', err)
      setError('Ошибка удаления задачи')
      return false
    }
  }, [fetchTasks])

  const getTasksForUser = useCallback((userId: string): Task[] => {
    return tasks.filter(t => t.assigned_to === userId)
  }, [tasks])

  const getTasksForDate = useCallback((date: Date): Task[] => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return tasks.filter(t => {
      if (!t.due_date) return false
      const taskDate = new Date(t.due_date)
      return taskDate >= startOfDay && taskDate <= endOfDay
    })
  }, [tasks])

  const getOverdueTasks = useCallback((): Task[] => {
    const now = new Date()
    return tasks.filter(t => 
      t.due_date && 
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
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
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

  // Первоначальная загрузка данных
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
