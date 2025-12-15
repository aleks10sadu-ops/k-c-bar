"use client"

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  User, 
  MessageSquare, 
  StickyNote, 
  ClipboardList,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Send,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/calendar/DateTimePicker'
import { cn } from '@/lib/utils'
import type { ActionType, TaskType, NewTask, User as UserType } from '@/types/database'
import { hapticFeedback } from '@/lib/telegram'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: NewTask) => void
  bartenders: UserType[]
  preselectedBartender?: string
}

const actionTypes: { value: ActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'task', 
    label: 'Задача', 
    icon: <ClipboardList className="w-5 h-5" />,
    description: 'Задание с шагами для выполнения'
  },
  { 
    value: 'chat', 
    label: 'Чат', 
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Написать сообщение в Telegram'
  },
  { 
    value: 'note', 
    label: 'Примечание', 
    icon: <StickyNote className="w-5 h-5" />,
    description: 'Заметка с файлом'
  },
]

const taskTypes: { value: TaskType; label: string; color: string }[] = [
  { value: 'prepare', label: 'Подготовить', color: 'bg-blue-500' },
  { value: 'check', label: 'Проверить', color: 'bg-emerald-500' },
  { value: 'inventory', label: 'Инвентаризация', color: 'bg-purple-500' },
  { value: 'execute', label: 'Выполнить', color: 'bg-amber-500' },
]

// Проверяем наличие Supabase
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  bartenders,
  preselectedBartender 
}: CreateTaskModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'datetime'>('type')
  const [actionType, setActionType] = useState<ActionType>('task')
  const [taskType, setTaskType] = useState<TaskType | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [taskSteps, setTaskSteps] = useState<string[]>([''])
  const [assignedTo, setAssignedTo] = useState(preselectedBartender || '')
  const [dueDate, setDueDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setStep('type')
    setActionType('task')
    setTaskType(null)
    setTitle('')
    setDescription('')
    setMessage('')
    setTaskSteps([''])
    setAssignedTo(preselectedBartender || '')
    setDueDate(new Date())
    setShowDatePicker(false)
    setFile(null)
    setIsUploading(false)
    setIsSendingMessage(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleActionTypeSelect = (type: ActionType) => {
    hapticFeedback('light')
    setActionType(type)
    setStep('details')
  }

  const handleAddStep = () => {
    hapticFeedback('light')
    setTaskSteps([...taskSteps, ''])
  }

  const handleRemoveStep = (index: number) => {
    hapticFeedback('light')
    if (taskSteps.length > 1) {
      setTaskSteps(taskSteps.filter((_, i) => i !== index))
    }
  }

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...taskSteps]
    newSteps[index] = value
    setTaskSteps(newSteps)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const uploadFile = async (): Promise<string | null> => {
    if (!file || !hasSupabase) return null
    
    setIsUploading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file)
      
      if (error) {
        console.error('Upload error:', error)
        return null
      }
      
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName)
      
      return urlData.publicUrl
    } catch (err) {
      console.error('Upload failed:', err)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const sendTelegramMessage = async () => {
    if (!assignedTo || !message.trim()) return false
    
    setIsSendingMessage(true)
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bartenderId: assignedTo,
          message: message.trim(),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      return true
    } catch (err) {
      console.error('Failed to send Telegram message:', err)
      return false
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleSubmitTask = async () => {
    if (!title.trim() || !assignedTo) return
    
    hapticFeedback('success')
    
    const filteredSteps = taskSteps.filter(s => s.trim())
    
    const newTask: NewTask = {
      title: title.trim(),
      description: null,
      action_type: 'task',
      task_type: taskType,
      due_date: dueDate.toISOString(),
      assigned_to: assignedTo,
      created_by: '',
      steps: filteredSteps.length > 0 ? filteredSteps : null,
    }

    onSubmit(newTask)
    handleClose()
  }

  const handleSubmitChat = async () => {
    if (!assignedTo || !message.trim()) return
    
    hapticFeedback('medium')
    
    const success = await sendTelegramMessage()
    
    if (success) {
      hapticFeedback('success')
      // Создаём запись в истории
      const newTask: NewTask = {
        title: `Сообщение в чат`,
        description: message.trim(),
        action_type: 'chat',
        task_type: null,
        due_date: null,
        assigned_to: assignedTo,
        created_by: '',
        status: 'completed',
      }
      onSubmit(newTask)
      handleClose()
    } else {
      hapticFeedback('error')
      alert('Не удалось отправить сообщение. Проверьте настройки бота.')
    }
  }

  const handleSubmitNote = async () => {
    if (!assignedTo || !description.trim()) return
    
    hapticFeedback('medium')
    
    let fileUrl: string | null = null
    if (file) {
      fileUrl = await uploadFile()
    }
    
    hapticFeedback('success')
    
    const newTask: NewTask = {
      title: 'Примечание',
      description: description.trim(),
      action_type: 'note',
      task_type: null,
      due_date: null,
      assigned_to: assignedTo,
      created_by: '',
      file_url: fileUrl,
    }

    onSubmit(newTask)
    handleClose()
  }

  const getModalTitle = () => {
    if (step === 'type') return 'Выберите тип'
    if (showDatePicker) return 'Срок выполнения'
    
    switch (actionType) {
      case 'task': return 'Новая задача'
      case 'chat': return 'Написать в чат'
      case 'note': return 'Новое примечание'
      default: return 'Детали'
    }
  }

  const selectedBartender = bartenders.find(b => b.id === assignedTo)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            {step !== 'type' && !showDatePicker && (
              <button 
                onClick={() => setStep('type')} 
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {showDatePicker && (
              <button 
                onClick={() => setShowDatePicker(false)} 
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Выбор типа */}
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4"
            >
              <div className="space-y-3">
                {actionTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleActionTypeSelect(type.value)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors text-left group border"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Форма ЗАДАЧИ */}
          {step === 'details' && actionType === 'task' && !showDatePicker && (
            <motion.div
              key="task-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4 max-h-[60vh] overflow-y-auto"
            >
              {/* Название */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Название задачи</label>
                <Input
                  placeholder="Что нужно сделать?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Шаги задачи */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Шаги выполнения</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddStep}
                    className="h-8 px-2 text-amber-600 hover:text-amber-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {taskSteps.map((taskStep, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="w-6 h-10 flex items-center justify-center text-sm text-muted-foreground font-medium">
                        {index + 1}.
                      </div>
                      <Input
                        placeholder={`Шаг ${index + 1}`}
                        value={taskStep}
                        onChange={(e) => handleStepChange(index, e.target.value)}
                        className="flex-1"
                      />
                      {taskSteps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Тип задачи */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Тип задачи</label>
                <div className="grid grid-cols-2 gap-2">
                  {taskTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        hapticFeedback('light')
                        setTaskType(type.value)
                      }}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-all",
                        taskType === type.value 
                          ? "border-primary bg-primary/10" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-3 h-3 rounded-full", type.color)} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Исполнитель */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Назначить</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите бармена" />
                  </SelectTrigger>
                  <SelectContent>
                    {bartenders.map((bartender) => (
                      <SelectItem key={bartender.id} value={bartender.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {bartender.first_name} {bartender.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Дата и время */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Срок выполнения</label>
                <button
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted transition-colors text-left"
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>{format(dueDate, "d MMMM yyyy, HH:mm", { locale: ru })}</span>
                </button>
              </div>

              {/* Кнопка создания */}
              <div className="pt-4">
                <Button 
                  onClick={handleSubmitTask} 
                  disabled={!title.trim() || !assignedTo}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Создать задачу
                </Button>
              </div>
            </motion.div>
          )}

          {/* Форма ЧАТА */}
          {step === 'details' && actionType === 'chat' && (
            <motion.div
              key="chat-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4"
            >
              {/* Выбор бармена */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Кому отправить</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите бармена" />
                  </SelectTrigger>
                  <SelectContent>
                    {bartenders.map((bartender) => (
                      <SelectItem key={bartender.id} value={bartender.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {bartender.first_name} {bartender.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Сообщение */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Сообщение</label>
                <Textarea
                  placeholder="Введите сообщение для отправки в Telegram..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[150px] resize-none"
                  autoFocus
                />
              </div>

              {selectedBartender && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💬 Сообщение будет отправлено <strong>{selectedBartender.first_name}</strong> в личные сообщения Telegram
                  </p>
                </div>
              )}

              {/* Кнопка отправки */}
              <div className="pt-4">
                <Button 
                  onClick={handleSubmitChat} 
                  disabled={!message.trim() || !assignedTo || isSendingMessage}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {isSendingMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Отправить
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Форма ПРИМЕЧАНИЯ */}
          {step === 'details' && actionType === 'note' && (
            <motion.div
              key="note-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4"
            >
              {/* Описание */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание</label>
                <Textarea
                  placeholder="Напишите заметку для барменов..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] resize-none"
                  autoFocus
                />
              </div>

              {/* Прикрепить файл */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Прикрепить файл</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                
                {file ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/50">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="w-8 h-8 text-green-500" />
                    ) : (
                      <FileText className="w-8 h-8 text-blue-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Выбрать файл</span>
                  </button>
                )}
              </div>

              {/* Назначить */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Назначить</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите бармена" />
                  </SelectTrigger>
                  <SelectContent>
                    {bartenders.map((bartender) => (
                      <SelectItem key={bartender.id} value={bartender.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {bartender.first_name} {bartender.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Кнопка создания */}
              <div className="pt-4">
                <Button 
                  onClick={handleSubmitNote} 
                  disabled={!description.trim() || !assignedTo || isUploading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка файла...
                    </>
                  ) : (
                    <>
                      <StickyNote className="w-4 h-4 mr-2" />
                      Создать примечание
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* DateTimePicker */}
          {showDatePicker && (
            <motion.div
              key="datepicker"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DateTimePicker
                value={dueDate}
                onChange={setDueDate}
                onClose={() => setShowDatePicker(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
