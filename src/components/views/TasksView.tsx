"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { useTasks } from '@/contexts/TaskContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Task, TaskStatus } from '@/types/database'

export function TasksView() {
  const { user, isAdmin } = useAuth()
  const { tasks, bartenders, completeTask, updateTask, deleteTask } = useTasks()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Фильтруем задачи
  const filteredTasks = useMemo(() => {
    let result = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.id)

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter(t => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
        )
      } else {
        result = result.filter(t => t.status === statusFilter)
      }
    }

    // Сортировка по дате создания (новые сверху)
    return result.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [tasks, searchQuery, statusFilter, isAdmin, user?.id])

  const getBartenderName = (id: string) => {
    const bartender = bartenders.find(b => b.id === id)
    return bartender ? `${bartender.first_name} ${bartender.last_name || ''}`.trim() : ''
  }

  const getCreatorName = (id: string) => {
    // Ищем среди всех пользователей
    const creator = bartenders.find(b => b.id === id)
    if (creator) {
      return `${creator.first_name} ${creator.last_name || ''}`.trim()
    }
    // Если это текущий пользователь (админ)
    if (user?.id === id) {
      return `${user.first_name} ${user.last_name || ''}`.trim()
    }
    return ''
  }

  // Счётчики
  const counts = useMemo(() => {
    const userTasks = isAdmin ? tasks : tasks.filter(t => t.assigned_to === user?.id)
    return {
      all: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      in_progress: userTasks.filter(t => t.status === 'in_progress').length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      overdue: userTasks.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
      ).length,
    }
  }, [tasks, isAdmin, user?.id])

  const statusTabs = [
    { value: 'all', label: 'Все', count: counts.all, icon: ListTodo },
    { value: 'pending', label: 'Ожидают', count: counts.pending, icon: Clock },
    { value: 'in_progress', label: 'В работе', count: counts.in_progress, icon: Clock },
    { value: 'completed', label: 'Готово', count: counts.completed, icon: CheckCircle2 },
    { value: 'overdue', label: 'Просрочено', count: counts.overdue, icon: AlertTriangle },
  ]

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  // Отмена выполнения задачи (вернуть в работу)
  const handleUndoComplete = async (id: string) => {
    await updateTask(id, {
      status: 'in_progress',
      completed_at: null,
      result_text: null,
      result_file_url: null,
    })
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        {/* Поиск */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Поиск задач..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </motion.div>

        {/* Фильтры по статусу */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto -mx-4 px-4"
        >
          <div className="flex gap-2 min-w-max">
            {statusTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = statusFilter === tab.value
              
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(tab.value as 'all' | TaskStatus)}
                  className="gap-1.5"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={
                      isActive 
                        ? "bg-white/20 px-1.5 rounded-full text-xs" 
                        : "bg-muted px-1.5 rounded-full text-xs"
                    }>
                      {tab.count}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
        </motion.div>

        {/* Список задач */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TaskCard
                    task={task}
                    onComplete={completeTask}
                    onDelete={isAdmin ? deleteTask : undefined}
                    onStartProgress={(id) => updateTask(id, { status: 'in_progress' })}
                    onClick={handleTaskClick}
                    showAssignee={isAdmin}
                    assigneeName={getBartenderName(task.assigned_to)}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <ListTodo className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg">Нет задач</h3>
                <p className="text-muted-foreground mt-1">
                  {searchQuery 
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Задачи появятся здесь после создания'
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Модальное окно деталей задачи */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={completeTask}
        onStartProgress={(id) => updateTask(id, { status: 'in_progress' })}
        onUndoComplete={handleUndoComplete}
        assigneeName={selectedTask ? getBartenderName(selectedTask.assigned_to) : undefined}
        creatorName={selectedTask ? getCreatorName(selectedTask.created_by) : undefined}
        isAdmin={isAdmin}
      />
    </>
  )
}
