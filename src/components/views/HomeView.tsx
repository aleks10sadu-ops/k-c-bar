"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ListTodo,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/stats/StatsCard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { useTasks } from '@/contexts/TaskContext'
import { useAuth } from '@/contexts/AuthContext'
import type { Task } from '@/types/database'

interface HomeViewProps {
  onNavigateToTasks: () => void
}

export function HomeView({ onNavigateToTasks }: HomeViewProps) {
  const { user, isAdmin } = useAuth()
  const { tasks, bartenders, getStats, completeTask, updateTask, getTasksForDate } = useTasks()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const stats = getStats(isAdmin ? undefined : user?.id)
  const todayTasks = getTasksForDate(new Date())
  const userTodayTasks = isAdmin 
    ? todayTasks 
    : todayTasks.filter(t => t.assigned_to === user?.id)

  const urgentTasks = userTodayTasks
    .filter(t => t.status !== 'completed')
    .slice(0, 3)

  const getBartenderName = (id: string) => {
    const bartender = bartenders.find(b => b.id === id)
    return bartender ? `${bartender.first_name} ${bartender.last_name?.[0] || ''}` : ''
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

  const handleUndoComplete = async (id: string) => {
    await updateTask(id, {
      status: 'in_progress',
      completed_at: null,
      result_text: null,
      result_file_url: null,
    })
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Приветствие и дата */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM", { locale: ru })}
        </p>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Всего задач"
          value={stats.total}
          icon={ListTodo}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Выполнено"
          value={stats.completed}
          subtitle={`${stats.completionRate}%`}
          icon={CheckCircle2}
          color="emerald"
          delay={0.1}
        />
        <StatsCard
          title="В работе"
          value={stats.pending + stats.inProgress}
          icon={Clock}
          color="amber"
          delay={0.2}
        />
        <StatsCard
          title="Просрочено"
          value={stats.overdue}
          icon={AlertTriangle}
          color="red"
          delay={0.3}
        />
      </div>

      {/* Средняя скорость */}
      {stats.averageCompletionTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Среднее время выполнения</p>
                <p className="text-2xl font-bold">{stats.averageCompletionTime} мин</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Срочные задачи на сегодня */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Задачи на сегодня
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onNavigateToTasks}>
                Все <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {urgentTasks.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {urgentTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={completeTask}
                      onStartProgress={(id) => updateTask(id, { status: 'in_progress' })}
                      onClick={setSelectedTask}
                      showAssignee={isAdmin}
                      assigneeName={getBartenderName(task.assigned_to)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <p className="text-muted-foreground">
                  Все задачи на сегодня выполнены! 🎉
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

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
    </div>
  )
}

