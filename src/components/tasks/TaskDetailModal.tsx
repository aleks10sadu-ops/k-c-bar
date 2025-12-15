"use client"

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  ClipboardList,
  StickyNote,
  FileText,
  ExternalLink,
  Calendar,
  Play,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Task, TaskType, TaskStatus, UpdateTask } from '@/types/database'

// Проверяем наличие Supabase
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onComplete?: (id: string, updates?: UpdateTask) => void
  onStartProgress?: (id: string) => void
  assigneeName?: string
  creatorName?: string
  isAdmin?: boolean
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

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Ожидает', 
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    icon: <Clock className="w-4 h-4" />
  },
  in_progress: { 
    label: 'В работе', 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    icon: <Play className="w-4 h-4" />
  },
  completed: { 
    label: 'Выполнено', 
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  overdue: { 
    label: 'Просрочено', 
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    icon: <AlertTriangle className="w-4 h-4" />
  },
}

export function TaskDetailModal({ 
  task, 
  isOpen, 
  onClose,
  onComplete,
  onStartProgress,
  assigneeName,
  creatorName,
  isAdmin = false
}: TaskDetailModalProps) {
  const [resultText, setResultText] = useState('')
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!task) return null

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  const displayStatus = isOverdue ? 'overdue' : task.status
  const statusInfo = statusConfig[displayStatus]

  // Можно выполнить только если есть результат (текст или файл)
  const canComplete = resultText.trim().length > 0 || resultFile !== null

  const uploadResultFile = async (): Promise<string | null> => {
    if (!resultFile) return null
    
    if (!hasSupabase) {
      console.log('Demo mode: result file upload simulated')
      return `https://demo.supabase.co/storage/v1/object/public/attachments/result-${resultFile.name}`
    }
    
    setIsUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const fileExt = resultFile.name.split('.').pop()
      const fileName = `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('attachments')
        .upload(fileName, resultFile, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Result upload error:', error.message)
        return null
      }
      
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName)
      
      return urlData.publicUrl
    } catch (err) {
      console.error('Result upload failed:', err)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleComplete = async () => {
    if (!canComplete) return
    
    let resultFileUrl: string | null = null
    if (resultFile) {
      resultFileUrl = await uploadResultFile()
    }
    
    const updates: UpdateTask = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      result_text: resultText.trim() || null,
      result_file_url: resultFileUrl,
    }
    
    onComplete?.(task.id, updates)
    setResultText('')
    setResultFile(null)
    onClose()
  }

  const handleStartProgress = () => {
    onStartProgress?.(task.id)
  }

  const handleOpenFile = () => {
    if (task.file_url) {
      window.open(task.file_url, '_blank')
    }
  }

  const handleOpenResultFile = () => {
    if (task.result_file_url) {
      window.open(task.result_file_url, '_blank')
    }
  }

  const handleResultFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setResultFile(selectedFile)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Оверлей */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          
          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md max-h-[85vh] bg-gray-900 border border-gray-800 rounded-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                {task.action_type === 'task' ? (
                  <ClipboardList className="w-5 h-5 text-amber-400" />
                ) : (
                  <StickyNote className="w-5 h-5 text-purple-400" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {task.action_type === 'task' ? 'Задача' : 'Примечание'}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Контент */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Название */}
              <h3 className="text-xl font-bold text-white mb-4">{task.title}</h3>

              {/* Статус и тип */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary" className={cn("gap-1.5", statusInfo.color)}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
                
                {task.task_type && (
                  <Badge variant="secondary" className={taskTypeColors[task.task_type]}>
                    {taskTypeLabels[task.task_type]}
                  </Badge>
                )}
              </div>

              {/* Описание (для примечаний) */}
              {task.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Описание</h4>
                  <p className="text-white whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Шаги задачи */}
              {task.steps && task.steps.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Шаги выполнения</h4>
                  <div className="space-y-2">
                    {task.steps.map((step, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          task.status === 'completed' 
                            ? "bg-emerald-500/10" 
                            : "bg-gray-800"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium",
                          task.status === 'completed'
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-700 text-gray-400"
                        )}>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={cn(
                          "text-sm pt-0.5",
                          task.status === 'completed' 
                            ? "text-emerald-400 line-through" 
                            : "text-white"
                        )}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Прикреплённый файл */}
              {task.file_url && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Прикреплённый файл</h4>
                  <button
                    onClick={handleOpenFile}
                    className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText className="w-6 h-6 text-blue-400" />
                    <span className="flex-1 text-white text-sm">Открыть файл</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              {/* Информация */}
              <div className="space-y-3">
                {/* Срок выполнения */}
                {task.due_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className={cn(
                      "w-5 h-5",
                      isOverdue ? "text-red-400" : "text-gray-400"
                    )} />
                    <span className="text-gray-400">Срок:</span>
                    <span className={cn(
                      "font-medium",
                      isOverdue ? "text-red-400" : "text-white"
                    )}>
                      {format(new Date(task.due_date), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                )}

                {/* Исполнитель */}
                {assigneeName && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">Исполнитель:</span>
                    <span className="text-white font-medium">{assigneeName}</span>
                  </div>
                )}

                {/* Создатель */}
                {creatorName && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">От:</span>
                    <span className="text-white font-medium">{creatorName}</span>
                  </div>
                )}

                {/* Дата создания */}
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Создано:</span>
                  <span className="text-white">
                    {format(new Date(task.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                  </span>
                </div>

                {/* Дата выполнения */}
                {task.completed_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-gray-400">Выполнено:</span>
                    <span className="text-emerald-400">
                      {format(new Date(task.completed_at), "d MMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                )}
              </div>

              {/* Результат выполнения (для просмотра админом) */}
              {task.status === 'completed' && (task.result_text || task.result_file_url) && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Результат выполнения
                  </h4>
                  
                  {task.result_text && (
                    <p className="text-white text-sm whitespace-pre-wrap mb-3">
                      {task.result_text}
                    </p>
                  )}
                  
                  {task.result_file_url && (
                    <button
                      onClick={handleOpenResultFile}
                      className="flex items-center gap-3 w-full p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <span className="flex-1 text-white text-sm">Файл результата</span>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Форма результата для бармена */}
            {task.action_type === 'task' && task.status !== 'completed' && !isAdmin && onComplete && (
              <div className="p-4 border-t border-gray-800 space-y-4 flex-shrink-0">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Результат выполнения *
                  </label>
                  <Textarea
                    placeholder="Опишите что было сделано..."
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                    className="min-h-[80px] resize-none bg-gray-800 border-gray-700"
                  />
                </div>

                {/* Прикрепить файл результата */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleResultFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  
                  {resultFile ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-gray-800/50">
                      {resultFile.type.startsWith('image/') ? (
                        <ImageIcon className="w-6 h-6 text-green-500" />
                      ) : (
                        <FileText className="w-6 h-6 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{resultFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(resultFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResultFile(null)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-600 hover:bg-gray-800/50 transition-colors text-gray-400 hover:text-white"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Прикрепить фото/файл</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  {task.status === 'pending' && onStartProgress && (
                    <Button
                      variant="outline"
                      onClick={handleStartProgress}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Начать
                    </Button>
                  )}
                  <Button
                    onClick={handleComplete}
                    disabled={!canComplete || isUploading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Выполнено
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  * Для завершения задачи необходимо указать результат или прикрепить файл
                </p>
              </div>
            )}

            {/* Действия для админа */}
            {task.action_type === 'task' && task.status !== 'completed' && isAdmin && (
              <div className="p-4 border-t border-gray-800 flex gap-3 flex-shrink-0">
                {task.status === 'pending' && onStartProgress && (
                  <Button
                    variant="outline"
                    onClick={handleStartProgress}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Начать
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

