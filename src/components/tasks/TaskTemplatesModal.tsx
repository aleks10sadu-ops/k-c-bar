"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  Save,
  FileText,
  Edit,
  Play,
  AlertTriangle,
  Calendar,
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
import { cn } from '@/lib/utils'
import { DateTimePicker } from '@/components/calendar/DateTimePicker'
import type {
  TaskTemplate,
  TaskTemplateItem,
  NewTaskTemplate,
  NewTaskTemplateItem,
  TaskType
} from '@/types/database'
import { useTasks } from '@/contexts/TaskContext'
import { hapticFeedback } from '@/lib/telegram'

interface TaskTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTasksFromTemplate?: (templateId: string, assignedTo: string[], taskDates?: {[taskId: string]: Date}) => void
  bartenders: UserType[]
}

const taskTypes: { value: TaskType; label: string; color: string }[] = [
  { value: 'prepare', label: 'Подготовить', color: 'bg-blue-500' },
  { value: 'check', label: 'Проверить', color: 'bg-emerald-500' },
  { value: 'urgent', label: 'Срочно', color: 'bg-red-500' },
  { value: 'normal', label: 'Не срочно', color: 'bg-gray-500' },
]

export function TaskTemplatesModal({
  isOpen,
  onClose,
  onCreateTasksFromTemplate,
  bartenders
}: TaskTemplatesModalProps) {
  const { taskTemplates, createTaskTemplate, deleteTaskTemplate, getTaskTemplateItems } = useTasks()
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'apply'>('list')
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<TaskTemplate | null>(null)

  // Для режима применения шаблона
  const [applySelectedBartenders, setApplySelectedBartenders] = useState<string[]>([])
  const [applyTaskDates, setApplyTaskDates] = useState<{[taskId: string]: Date}>({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null)

  // Для режима редактирования шаблона
  const [editShowDatePicker, setEditShowDatePicker] = useState(false)
  const [editDatePickerTaskIndex, setEditDatePickerTaskIndex] = useState<number | null>(null)

  // Форма создания/редактирования шаблона
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateItems, setTemplateItems] = useState<NewTaskTemplateItem[]>([
    { title: '', description: '', task_type: null, steps: [], due_date: null }
  ])

  const resetForm = () => {
    setTemplateName('')
    setTemplateDescription('')
    setTemplateItems([{ title: '', description: '', task_type: null, steps: [], due_date: null }])
    setEditingTemplate(null)
    setSelectedTemplate(null)
    setApplySelectedBartenders([])
    setApplyTaskDates({})
  }

  const handleClose = () => {
    resetForm()
    setMode('list')
    onClose()
  }

  const handleCreateTemplate = () => {
    setMode('create')
    resetForm()
  }

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateDescription(template.description || '')
    const items = getTaskTemplateItems(template.id)
    setTemplateItems(items.map(item => ({
      title: item.title,
      description: item.description || '',
      task_type: item.task_type,
      steps: item.steps || [],
      due_date: item.due_date || null
    })))
    setMode('edit')
  }

  const handleAddTemplateItem = () => {
    hapticFeedback('light')
    setTemplateItems([...templateItems, { title: '', description: '', task_type: null, steps: [], due_date: null }])
  }

  const handleRemoveTemplateItem = (index: number) => {
    hapticFeedback('light')
    if (templateItems.length > 1) {
      setTemplateItems(templateItems.filter((_, i) => i !== index))
    }
  }

  const handleUpdateTemplateItem = (index: number, field: keyof NewTaskTemplateItem, value: any) => {
    const newItems = [...templateItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setTemplateItems(newItems)
  }

  const handleAddStep = (itemIndex: number) => {
    const newItems = [...templateItems]
    const item = newItems[itemIndex]
    item.steps = [...(item.steps || []), '']
    setTemplateItems(newItems)
  }

  const handleRemoveStep = (itemIndex: number, stepIndex: number) => {
    const newItems = [...templateItems]
    const item = newItems[itemIndex]
    item.steps = item.steps?.filter((_, i) => i !== stepIndex) || []
    setTemplateItems(newItems)
  }

  const handleUpdateStep = (itemIndex: number, stepIndex: number, value: string) => {
    const newItems = [...templateItems]
    const item = newItems[itemIndex]
    if (item.steps) {
      item.steps[stepIndex] = value
    }
    setTemplateItems(newItems)
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return

    hapticFeedback('success')

    const filteredItems = templateItems
      .filter(item => item.title.trim())
      .map(item => ({
        title: item.title.trim(),
        description: item.description?.trim() || null,
        task_type: item.task_type,
        steps: item.steps?.filter(s => s.trim()) || null,
        due_date: item.due_date,
      }))

    const templateData: NewTaskTemplate = {
      name: templateName.trim(),
      description: templateDescription.trim() || null,
    }

    await createTaskTemplate(templateData, filteredItems)

    handleClose()
  }

  const handleUseTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setMode('apply')
  }

  const handleDeleteTemplate = async (template: TaskTemplate) => {
    if (await deleteTaskTemplate(template.id)) {
      hapticFeedback('success')
    }
  }

  const confirmDeleteTemplate = (template: TaskTemplate) => {
    setTemplateToDelete(template)
  }

  const executeDeleteTemplate = async () => {
    if (templateToDelete) {
      await handleDeleteTemplate(templateToDelete)
      setTemplateToDelete(null)
    }
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || applySelectedBartenders.length === 0) return

    hapticFeedback('success')

    if (onCreateTasksFromTemplate) {
      // Используем новый подход с индивидуальными сроками
      const items = getTaskTemplateItems(selectedTemplate.id)
      const taskDates: {[taskId: string]: Date} = {}
      items.forEach(item => {
        if (applyTaskDates[item.id]) {
          taskDates[item.id] = applyTaskDates[item.id]
        }
      })

      await onCreateTasksFromTemplate(selectedTemplate.id, applySelectedBartenders, taskDates)
    }

    handleClose()
  }

  const handleOpenDatePicker = (taskId: string) => {
    setDatePickerTaskId(taskId)
    setShowDatePicker(true)
  }

  const handleDatePickerClose = () => {
    setShowDatePicker(false)
    setDatePickerTaskId(null)
  }

  const handleDateChange = (date: Date) => {
    if (datePickerTaskId) {
      setApplyTaskDates(prev => ({
        ...prev,
        [datePickerTaskId]: date
      }))
    }
    handleDatePickerClose()
  }

  const handleEditDatePickerOpen = (taskIndex: number) => {
    setEditDatePickerTaskIndex(taskIndex)
    setEditShowDatePicker(true)
  }

  const handleEditDatePickerClose = () => {
    setEditShowDatePicker(false)
    setEditDatePickerTaskIndex(null)
  }

  const handleEditDateChange = (date: Date) => {
    if (editDatePickerTaskIndex !== null) {
      handleUpdateTemplateItem(editDatePickerTaskIndex, 'due_date', date.toISOString())
    }
    handleEditDatePickerClose()
  }

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Создать шаблон'
      case 'edit': return 'Редактировать шаблон'
      case 'apply': return `Применить шаблон: ${selectedTemplate?.name}`
      default: return 'Шаблоны задач'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            {mode !== 'list' && (
              <button
                onClick={() => {
                  setMode('list')
                  resetForm()
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Список шаблонов */}
          {mode === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground">
                    Создавайте шаблоны для повторяющихся задач
                  </p>
                  <Button onClick={handleCreateTemplate} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </Button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {taskTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Нет созданных шаблонов</p>
                      <p className="text-sm">Создайте свой первый шаблон</p>
                    </div>
                  ) : (
                    taskTemplates.map((template) => {
                      const items = getTaskTemplateItems(template.id)
                      return (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {items.length} задач
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUseTemplate(template)}
                              title="Применить шаблон"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteTemplate(template)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Форма создания/редактирования */}
          {(mode === 'create' || mode === 'edit') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              {/* Название шаблона */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Название шаблона</label>
                <Input
                  placeholder="Например: Открытие бара"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Описание шаблона */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Описание (необязательно)</label>
                <Textarea
                  placeholder="Краткое описание шаблона..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Задачи шаблона */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Задачи шаблона</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddTemplateItem}
                    className="h-8 px-2 text-amber-600 hover:text-amber-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить задачу
                  </Button>
                </div>

                <div className="space-y-4">
                  {templateItems.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-4 rounded-xl border space-y-3">
                      {/* Заголовок задачи */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Название задачи"
                          value={item.title}
                          onChange={(e) => handleUpdateTemplateItem(itemIndex, 'title', e.target.value)}
                          className="flex-1"
                        />
                        {templateItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTemplateItem(itemIndex)}
                            className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Тип задачи */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Тип задачи</label>
                        <div className="grid grid-cols-2 gap-2">
                          {taskTypes.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => {
                                hapticFeedback('light')
                                handleUpdateTemplateItem(itemIndex, 'task_type', type.value)
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                                item.task_type === type.value
                                  ? "border-primary bg-primary/10"
                                  : "hover:bg-muted"
                              )}
                            >
                              <div className={cn("w-2 h-2 rounded-full", type.color)} />
                              <span className="text-xs font-medium">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Срок выполнения по умолчанию */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Срок выполнения по умолчанию</label>
                        <button
                          onClick={() => handleEditDatePickerOpen(itemIndex)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg border hover:bg-muted transition-colors text-left"
                        >
                          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className={item.due_date ? 'text-sm' : 'text-sm text-muted-foreground'}>
                            {item.due_date
                              ? format(new Date(item.due_date), "d MMMM yyyy, HH:mm", { locale: ru })
                              : 'Не указан'
                            }
                          </span>
                        </button>
                      </div>

                      {/* Шаги выполнения */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">Шаги выполнения</label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddStep(itemIndex)}
                            className="h-6 px-2 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Шаг
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {(item.steps || []).map((step, stepIndex) => (
                            <div key={stepIndex} className="flex gap-2">
                              <div className="w-4 h-6 flex items-center justify-center text-xs text-muted-foreground">
                                {stepIndex + 1}.
                              </div>
                              <Input
                                placeholder={`Шаг ${stepIndex + 1}`}
                                value={step}
                                onChange={(e) => handleUpdateStep(itemIndex, stepIndex, e.target.value)}
                                className="flex-1 h-8 text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveStep(itemIndex, stepIndex)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Кнопки */}
              <div className="pt-4 flex gap-2">
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || !templateItems.some(item => item.title.trim())}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Создать шаблон' : 'Сохранить изменения'}
                </Button>
              </div>
            </motion.div>
          )}
          {/* Применение шаблона */}
          {mode === 'apply' && selectedTemplate && (
            <motion.div
              key="apply"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 pt-4 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              <div className="space-y-4">
                {/* Выбор барменов */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Назначить барменов ({applySelectedBartenders.length})
                  </label>
                  <div className="max-h-[150px] overflow-y-auto space-y-2">
                    {bartenders.map((bartender) => {
                      const isSelected = applySelectedBartenders.includes(bartender.id)
                      return (
                        <button
                          key={bartender.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setApplySelectedBartenders(prev => prev.filter(id => id !== bartender.id))
                            } else {
                              setApplySelectedBartenders(prev => [...prev, bartender.id])
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                            isSelected
                              ? "border-amber-500 bg-amber-500/10"
                              : "border-gray-200 dark:border-gray-700 hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-gray-300 dark:border-gray-600"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">{bartender.first_name} {bartender.last_name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Задачи шаблона с настройкой сроков */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Настройка сроков выполнения задач</label>
                  <div className="space-y-3">
                    {getTaskTemplateItems(selectedTemplate.id).map((item, index) => (
                      <div key={item.id} className="p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {index + 1}.
                            </span>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <div className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            item.task_type === 'urgent' ? 'bg-red-100 text-red-700' :
                            item.task_type === 'normal' ? 'bg-gray-100 text-gray-700' :
                            item.task_type === 'prepare' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                          )}>
                            {item.task_type === 'urgent' ? 'Срочно' :
                             item.task_type === 'normal' ? 'Не срочно' :
                             item.task_type === 'prepare' ? 'Подготовить' : 'Проверить'}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenDatePicker(item.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-muted transition-colors text-left"
                        >
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className={applyTaskDates[item.id] ? 'text-foreground' : 'text-muted-foreground'}>
                            {applyTaskDates[item.id]
                              ? format(applyTaskDates[item.id], "d MMMM yyyy, HH:mm", { locale: ru })
                              : 'Выбрать срок выполнения'
                            }
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Кнопки применения */}
                <div className="pt-4 flex gap-2">
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={applySelectedBartenders.length === 0}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Применить шаблон ({applySelectedBartenders.length} × {getTaskTemplateItems(selectedTemplate.id).length})
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* DateTimePicker для применения шаблона */}
          {showDatePicker && (
            <motion.div
              key="datepicker-apply"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0"
            >
              <DateTimePicker
                value={datePickerTaskId && applyTaskDates[datePickerTaskId] ? applyTaskDates[datePickerTaskId] : new Date()}
                onChange={handleDateChange}
                onClose={handleDatePickerClose}
              />
            </motion.div>
          )}

          {/* DateTimePicker для редактирования шаблона */}
          {editShowDatePicker && editDatePickerTaskIndex !== null && (
            <motion.div
              key="datepicker-edit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0"
            >
              <DateTimePicker
                value={templateItems[editDatePickerTaskIndex]?.due_date
                  ? new Date(templateItems[editDatePickerTaskIndex].due_date!)
                  : new Date()
                }
                onChange={handleEditDateChange}
                onClose={handleEditDatePickerClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* Диалог подтверждения удаления */}
      <Dialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Удаление шаблона
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Вы действительно хотите удалить шаблон <strong>"{templateToDelete?.name}"</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              Это действие нельзя будет отменить. Все связанные задачи останутся без изменений.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setTemplateToDelete(null)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={executeDeleteTemplate}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
