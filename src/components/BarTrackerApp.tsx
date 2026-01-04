"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Navigation } from '@/components/layout/Navigation'
import { HomeView } from '@/components/views/HomeView'
import { TasksView } from '@/components/views/TasksView'
import { TeamView } from '@/components/views/TeamView'
import { StatsView } from '@/components/views/StatsView'
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal'
import { TaskTemplatesModal } from '@/components/tasks/TaskTemplatesModal'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useTasks } from '@/contexts/TaskContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Wine } from 'lucide-react'
import type { NewTask, Task } from '@/types/database'

type NavItem = 'home' | 'tasks' | 'team' | 'stats'

export function BarTrackerApp() {
  const { user, isLoading: authLoading, isAdmin } = useAuth()
  const { tasks, bartenders, createTask, completeTask, updateTask, createTasksFromTemplate, isLoading: tasksLoading } = useTasks()
  const { pendingTaskId, clearPendingTask } = useNotifications()

  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [preselectedBartender, setPreselectedBartender] = useState<string | undefined>()
  const [selectedTaskFromNotification, setSelectedTaskFromNotification] = useState<Task | null>(null)

  // Обработка открытия задачи из уведомления
  useEffect(() => {
    if (pendingTaskId) {
      const task = tasks.find(t => t.id === pendingTaskId)
      if (task) {
        setSelectedTaskFromNotification(task)
      }
      clearPendingTask()
    }
  }, [pendingTaskId, tasks, clearPendingTask])

  const handleNavigate = (item: NavItem) => {
    setActiveNav(item)
  }

  const handleOpenCreateModal = (bartenderId?: string) => {
    setPreselectedBartender(bartenderId)
    setIsCreateModalOpen(true)
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    setPreselectedBartender(undefined)
  }

  const handleCreateTask = async (task: NewTask) => {
    await createTask(task)
  }

  const handleOpenTemplatesModal = () => {
    setIsTemplatesModalOpen(true)
  }

  const handleCloseTemplatesModal = () => {
    setIsTemplatesModalOpen(false)
  }

  const handleCreateTasksFromTemplate = async (templateId: string, assignedTo: string[], taskDates?: {[taskId: string]: Date}) => {
    await createTasksFromTemplate(templateId, assignedTo, taskDates)
  }

  const getBartenderName = (id: string) => {
    const bartender = bartenders.find(b => b.id === id)
    return bartender ? `${bartender.first_name} ${bartender.last_name || ''}`.trim() : ''
  }

  const getCreatorName = (id: string) => {
    const creator = bartenders.find(b => b.id === id)
    if (creator) {
      return `${creator.first_name} ${creator.last_name || ''}`.trim()
    }
    if (user?.id === id) {
      return `${user.first_name} ${user.last_name || ''}`.trim()
    }
    return ''
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

  // Loading состояние
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"
          >
            <Wine className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-muted-foreground">Загрузка...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-yellow-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Декоративные элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-amber-400/20 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="relative max-w-lg mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {activeNav === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <HomeView onNavigateToTasks={() => setActiveNav('tasks')} />
            </motion.div>
          )}

          {activeNav === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TasksView />
            </motion.div>
          )}

          {activeNav === 'team' && isAdmin && (
            <motion.div
              key="team"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TeamView onCreateTaskForBartender={handleOpenCreateModal} />
            </motion.div>
          )}

          {activeNav === 'stats' && isAdmin && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <StatsView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Navigation
        activeItem={activeNav}
        onNavigate={handleNavigate}
        onCreateTask={() => handleOpenCreateModal()}
        onOpenTemplates={handleOpenTemplatesModal}
      />

      {/* Модальное окно создания задачи */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateTask}
        bartenders={bartenders}
        preselectedBartender={preselectedBartender}
      />

      {/* Модальное окно шаблонов задач */}
      <TaskTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={handleCloseTemplatesModal}
        onCreateTasksFromTemplate={handleCreateTasksFromTemplate}
        bartenders={bartenders}
      />

      {/* Панель уведомлений */}
      <NotificationPanel />

      {/* Модальное окно задачи из уведомления */}
      <TaskDetailModal
        task={selectedTaskFromNotification}
        isOpen={!!selectedTaskFromNotification}
        onClose={() => setSelectedTaskFromNotification(null)}
        onComplete={completeTask}
        onStartProgress={(id) => updateTask(id, { status: 'in_progress' })}
        onUndoComplete={handleUndoComplete}
        assigneeName={selectedTaskFromNotification ? getBartenderName(selectedTaskFromNotification.assigned_to) : undefined}
        creatorName={selectedTaskFromNotification ? getCreatorName(selectedTaskFromNotification.created_by) : undefined}
        isAdmin={isAdmin}
      />
    </div>
  )
}

