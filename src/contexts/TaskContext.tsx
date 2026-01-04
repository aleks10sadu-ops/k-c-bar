"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import type {
  Task, NewTask, UpdateTask, User, TaskStatus,
  TaskTemplate, NewTaskTemplate, UpdateTaskTemplate,
  TaskTemplateItem, NewTaskTemplateItem, UpdateTaskTemplateItem
} from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface TaskContextType {
  tasks: Task[]
  bartenders: User[]
  taskTemplates: TaskTemplate[]
  isLoading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  fetchBartenders: () => Promise<void>
  fetchTaskTemplates: () => Promise<void>
  createTask: (task: NewTask) => Promise<Task | null>
  updateTask: (id: string, updates: UpdateTask) => Promise<boolean>
  completeTask: (id: string, updates?: UpdateTask) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  createTaskTemplate: (template: NewTaskTemplate, items: NewTaskTemplateItem[]) => Promise<TaskTemplate | null>
  updateTaskTemplate: (id: string, updates: UpdateTaskTemplate) => Promise<boolean>
  deleteTaskTemplate: (id: string) => Promise<boolean>
  getTaskTemplateItems: (templateId: string) => TaskTemplateItem[]
  createTasksFromTemplate: (templateId: string, assignedTo: string[], taskDates?: {[taskId: string]: Date}) => Promise<Task[]>
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
    result_text: null,
    result_file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Инвентаризация алкоголя',
    description: null,
    action_type: 'task',
    task_type: 'check',
    status: 'in_progress',
    due_date: new Date(Date.now() + 7200000).toISOString(),
    assigned_to: 'bartender-2',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: ['Пересчитать виски', 'Пересчитать ром', 'Записать в журнал'],
    result_text: null,
    result_file_url: null,
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
    result_text: 'Все сиропы проверены, 2 просроченных убраны',
    result_file_url: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '5',
    title: 'Срочно подготовить VIP-зал',
    description: null,
    action_type: 'task',
    task_type: 'urgent',
    status: 'pending',
    due_date: new Date(Date.now() + 1800000).toISOString(),
    assigned_to: 'bartender-1',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: ['Убрать и протереть столы', 'Проверить освещение', 'Подготовить премиум напитки'],
    result_text: null,
    result_file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Ежедневная уборка бара',
    description: null,
    action_type: 'task',
    task_type: 'normal',
    status: 'pending',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    assigned_to: 'bartender-2',
    created_by: 'demo-user',
    completed_at: null,
    file_url: null,
    steps: ['Протереть барную стойку', 'Вымыть бокалы', 'Убрать мусор'],
    result_text: null,
    result_file_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    result_text: null,
    result_file_url: null,
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
    result_text: newTask.result_text ?? null,
    result_file_url: newTask.result_file_url ?? null,
    created_at: newTask.created_at ?? now,
    updated_at: newTask.updated_at ?? now,
  }
}

// Демо шаблоны для разработки
const demoTaskTemplates: TaskTemplate[] = [
  {
    id: 'template-1',
    name: 'Открытие бара',
    description: 'Стандартные задачи для открытия бара',
    created_by: 'bartender-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-2',
    name: 'Закрытие бара',
    description: 'Задачи для закрытия бара',
    created_by: 'bartender-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Демо элементы шаблонов
const demoTaskTemplateItems: TaskTemplateItem[] = [
  {
    id: 'item-1',
    template_id: 'template-1',
    title: 'Подготовить барную станцию',
    description: 'Проверить готовность рабочего места',
    task_type: 'prepare',
    steps: ['Проверить лёд', 'Подготовить гарниры', 'Разложить инструменты'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    template_id: 'template-1',
    title: 'Проверить оборудование',
    description: 'Убедиться что всё оборудование работает',
    task_type: 'check',
    steps: ['Проверить кофемашину', 'Проверить кассу', 'Проверить освещение'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'item-3',
    template_id: 'template-2',
    title: 'Убрать барную станцию',
    description: 'Привести бар в порядок перед закрытием',
    task_type: 'normal',
    steps: ['Убрать грязную посуду', 'Протереть поверхности', 'Выключить оборудование'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(demoTasks)
  const [bartenders, setBartenders] = useState<User[]>(demoBartenders)
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(demoTaskTemplates)
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

  const fetchTaskTemplates = useCallback(async () => {
    if (!hasSupabase) return // Используем демо данные

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.warn('Using demo task templates:', fetchError.message)
        return
      }

      if (data) {
        setTaskTemplates(data)
      }
    } catch (err) {
      console.error('Fetch task templates error:', err)
    }
  }, [])

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
        due_date: newTask.due_date ?? null,
        assigned_to: newTask.assigned_to,
        created_by: user.id,
        file_url: newTask.file_url ?? null,
        steps: newTask.steps ?? null,
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

  const createTaskTemplate = useCallback(async (template: NewTaskTemplate, items: NewTaskTemplateItem[]): Promise<TaskTemplate | null> => {
    if (!user) return null

    try {
      // Демо режим - создаём локально
      if (!hasSupabase) {
        const demoTemplate: TaskTemplate = {
          id: `demo-template-${Date.now()}`,
          name: template.name,
          description: template.description ?? null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setTaskTemplates(prev => [...prev, demoTemplate])
        return demoTemplate
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Создаём шаблон
      const templateData = {
        name: template.name,
        description: template.description ?? null,
        created_by: user.id,
      }

      const { data: templateResult, error: templateError } = await supabase
        .from('task_templates')
        .insert(templateData as never)
        .select()
        .single()

      if (templateError) {
        console.warn('Template insert error, using demo mode:', templateError.message)
        const demoTemplate: TaskTemplate = {
          id: `demo-template-${Date.now()}`,
          name: template.name,
          description: template.description ?? null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setTaskTemplates(prev => [...prev, demoTemplate])

        // Создаём элементы шаблона для демо
        if (items.length > 0) {
          // В демо режиме элементы не сохраняются в базу
          console.log('Demo mode: template items not saved to database')
        }

        return demoTemplate
      }

      // Создаём элементы шаблона
      if (items.length > 0 && templateResult) {
        const result = templateResult as TaskTemplate
        const itemsData = items.map(item => ({
          template_id: result.id,
          title: item.title,
          description: item.description ?? null,
          task_type: item.task_type ?? null,
          steps: item.steps ?? null,
          due_date: item.due_date ?? null,
        }))

        const { error: itemsError } = await supabase
          .from('task_template_items')
          .insert(itemsData as never)

        if (itemsError) {
          console.warn('Template items insert error:', itemsError.message)
        }
      }

      return templateResult as TaskTemplate
    } catch (err) {
      console.error('Create task template error:', err)
      setError('Ошибка создания шаблона')
      return null
    }
  }, [user])

  const updateTaskTemplate = useCallback(async (id: string, updates: UpdateTaskTemplate): Promise<boolean> => {
    try {
      // Оптимистичное обновление
      setTaskTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
      ))

      if (!hasSupabase) return true

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('task_templates')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)

      if (updateError) {
        console.warn('Update template error:', updateError.message)
        await fetchTaskTemplates()
        return false
      }

      return true
    } catch (err) {
      console.error('Update task template error:', err)
      setError('Ошибка обновления шаблона')
      return false
    }
  }, [fetchTaskTemplates])

  const deleteTaskTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Оптимистичное удаление
      setTaskTemplates(prev => prev.filter(t => t.id !== id))

      if (!hasSupabase) return true

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.warn('Delete template error:', deleteError.message)
        await fetchTaskTemplates()
        return false
      }

      return true
    } catch (err) {
      console.error('Delete task template error:', err)
      setError('Ошибка удаления шаблона')
      return false
    }
  }, [fetchTaskTemplates])

  const getTaskTemplateItems = useCallback((templateId: string): TaskTemplateItem[] => {
    return demoTaskTemplateItems.filter(item => item.template_id === templateId)
  }, [])

  const createTasksFromTemplate = useCallback(async (templateId: string, assignedTo: string[], taskDates?: {[taskId: string]: Date}): Promise<Task[]> => {
    if (!user) return []

    const template = taskTemplates.find(t => t.id === templateId)
    if (!template) return []

    const items = getTaskTemplateItems(templateId)
    const createdTasks: Task[] = []

    for (const item of items) {
      for (const assignee of assignedTo) {
        const newTask: NewTask = {
          title: item.title,
          description: item.description ?? null,
          action_type: 'task',
          task_type: item.task_type ?? null,
          due_date: taskDates && taskDates[item.id] ? taskDates[item.id].toISOString() : null,
          assigned_to: assignee,
          created_by: user.id,
          steps: item.steps ?? null,
        }

        const createdTask = await createTask(newTask)
        if (createdTask) {
          createdTasks.push(createdTask)
        }
      }
    }

    return createdTasks
  }, [user, taskTemplates, getTaskTemplateItems, createTask])

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

  const completeTask = useCallback(async (id: string, updates?: UpdateTask): Promise<boolean> => {
    // Найдём задачу, чтобы проверить срок выполнения
    const task = tasks.find(t => t.id === id)
    const now = new Date()

    // Определяем статус: если задача выполняется после срока - overdue, иначе completed
    const status = task?.due_date && new Date(task.due_date) < now ? 'overdue' : 'completed'

    return updateTask(id, {
      status,
      completed_at: new Date().toISOString(),
      ...updates,
    })
  }, [updateTask, tasks])

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
    // Исключаем примечания из статистики - считаем только задачи
    const allTasks = tasks.filter(t => t.action_type === 'task')
    const filteredTasks = userId 
      ? allTasks.filter(t => t.assigned_to === userId)
      : allTasks

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
      fetchTaskTemplates()
      if (isAdmin) {
        fetchBartenders()
      }
    }
  }, [user, isAdmin, fetchTasks, fetchBartenders, fetchTaskTemplates])

  const value: TaskContextType = {
    tasks,
    bartenders,
    taskTemplates,
    isLoading,
    error,
    fetchTasks,
    fetchBartenders,
    fetchTaskTemplates,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    createTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    getTaskTemplateItems,
    createTasksFromTemplate,
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
