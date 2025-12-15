"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  User, 
  MessageSquare, 
  StickyNote, 
  ClipboardList,
  Paperclip,
  ChevronRight
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
    description: 'Задание для выполнения'
  },
  { 
    value: 'chat', 
    label: 'Чат', 
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Написать в ЛС'
  },
  { 
    value: 'note', 
    label: 'Примечание', 
    icon: <StickyNote className="w-5 h-5" />,
    description: 'Заметка или файл'
  },
]

const taskTypes: { value: TaskType; label: string; color: string }[] = [
  { value: 'prepare', label: 'Подготовить', color: 'bg-blue-500' },
  { value: 'check', label: 'Проверить', color: 'bg-emerald-500' },
  { value: 'inventory', label: 'Инвентаризация', color: 'bg-purple-500' },
  { value: 'execute', label: 'Выполнить', color: 'bg-amber-500' },
]

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
  const [assignedTo, setAssignedTo] = useState(preselectedBartender || '')
  const [dueDate, setDueDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const resetForm = () => {
    setStep('type')
    setActionType('task')
    setTaskType(null)
    setTitle('')
    setDescription('')
    setAssignedTo(preselectedBartender || '')
    setDueDate(new Date())
    setShowDatePicker(false)
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

  const handleSubmit = () => {
    if (!title.trim() || !assignedTo) return

    hapticFeedback('success')
    
    const newTask: NewTask = {
      title: title.trim(),
      description: description.trim() || null,
      action_type: actionType,
      task_type: actionType === 'task' ? taskType : null,
      due_date: dueDate.toISOString(),
      assigned_to: assignedTo,
      created_by: '', // Будет заполнено в контексте
    }

    onSubmit(newTask)
    handleClose()
  }

  const canSubmit = title.trim() && assignedTo

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">
            {step === 'type' && 'Выберите тип'}
            {step === 'details' && 'Детали'}
            {step === 'datetime' && 'Дата и время'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
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

          {step === 'details' && !showDatePicker && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4"
            >
              {/* Название */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Название</label>
                <Input
                  placeholder="Что нужно сделать?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Описание */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание (опционально)</label>
                <Textarea
                  placeholder="Добавьте детали..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Тип задачи (только для action_type = task) */}
              {actionType === 'task' && (
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
              )}

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

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('type')} className="flex-1">
                  Назад
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canSubmit}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  Создать
                </Button>
              </div>
            </motion.div>
          )}

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

