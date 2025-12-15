"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  StickyNote, 
  ClipboardList,
  MoreVertical,
  Trash2,
  Play
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn, getRelativeTime } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Task, TaskType, ActionType, TaskStatus } from '@/types/database'
import { hapticFeedback } from '@/lib/telegram'

interface TaskCardProps {
  task: Task
  onComplete?: (id: string) => void
  onDelete?: (id: string) => void
  onStartProgress?: (id: string) => void
  onClick?: (task: Task) => void
  showAssignee?: boolean
  assigneeName?: string
}

const taskTypeLabels: Record<TaskType, string> = {
  prepare: 'Подготовить',
  check: 'Проверить',
  inventory: 'Инвентаризация',
  execute: 'Выполнить',
}

const taskTypeColors: Record<TaskType, string> = {
  prepare: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  check: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inventory: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  execute: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

const actionTypeIcons: Record<ActionType, React.ReactNode> = {
  task: <ClipboardList className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
  note: <StickyNote className="w-4 h-4" />,
}

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Ожидает', 
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    icon: <Clock className="w-3 h-3" />
  },
  in_progress: { 
    label: 'В работе', 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: <Play className="w-3 h-3" />
  },
  completed: { 
    label: 'Выполнено', 
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  overdue: { 
    label: 'Просрочено', 
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    icon: <AlertTriangle className="w-3 h-3" />
  },
}

export function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  onStartProgress,
  onClick,
  showAssignee,
  assigneeName
}: TaskCardProps) {
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed'
  const displayStatus = isOverdue && task.status !== 'completed' ? 'overdue' : task.status
  const statusInfo = statusConfig[displayStatus]

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('success')
    onComplete?.(task.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('warning')
    onDelete?.(task.id)
  }

  const handleStartProgress = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticFeedback('light')
    onStartProgress?.(task.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          task.status === 'completed' && "opacity-60",
          isOverdue && "border-red-500/50 bg-red-500/5"
        )}
        onClick={() => onClick?.(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Чекбокс */}
            <div className="pt-0.5">
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={() => onComplete?.(task.id)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className={cn(
                    "font-medium text-base line-clamp-2",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Иконка типа действия */}
                <div className="text-muted-foreground">
                  {actionTypeIcons[task.action_type]}
                </div>
              </div>

              {/* Метаданные */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Статус */}
                <Badge variant="secondary" className={cn("gap-1", statusInfo.color)}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>

                {/* Тип задачи */}
                {task.task_type && (
                  <Badge variant="secondary" className={taskTypeColors[task.task_type]}>
                    {taskTypeLabels[task.task_type]}
                  </Badge>
                )}

                {/* Время */}
                <span className={cn(
                  "text-xs",
                  isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
                )}>
                  {getRelativeTime(new Date(task.due_date))}
                </span>

                {/* Исполнитель */}
                {showAssignee && assigneeName && (
                  <span className="text-xs text-muted-foreground">
                    → {assigneeName}
                  </span>
                )}
              </div>

              {/* Точное время */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(task.due_date), "d MMM, HH:mm", { locale: ru })}
              </div>
            </div>

            {/* Действия */}
            <div className="flex flex-col gap-1">
              {task.status === 'pending' && onStartProgress && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleStartProgress}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
              {task.status !== 'completed' && onComplete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-emerald-600"
                  onClick={handleComplete}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

