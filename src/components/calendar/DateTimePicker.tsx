"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon,
  Timer,
  Sun,
  Sunset,
  Moon
} from 'lucide-react'
import { 
  format, 
  addMinutes, 
  addHours, 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  endOfWeek as getEndOfWeek
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateTimeSlots } from '@/lib/utils'

interface DateTimePickerProps {
  value: Date
  onChange: (date: Date) => void
  onClose?: () => void
}

type ViewMode = 'presets' | 'calendar' | 'time'

interface TimePreset {
  label: string
  getValue: () => Date
  icon?: React.ReactNode
}

const timePresets: TimePreset[] = [
  { label: 'Через 15 минут', getValue: () => addMinutes(new Date(), 15), icon: <Timer className="w-4 h-4" /> },
  { label: 'Через 30 минут', getValue: () => addMinutes(new Date(), 30), icon: <Timer className="w-4 h-4" /> },
  { label: 'Через час', getValue: () => addHours(new Date(), 1), icon: <Clock className="w-4 h-4" /> },
  { label: 'Сегодня вечером', getValue: () => {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    return d
  }, icon: <Sunset className="w-4 h-4" /> },
  { label: 'Завтра', getValue: () => {
    const d = addDays(new Date(), 1)
    d.setHours(10, 0, 0, 0)
    return d
  }, icon: <Sun className="w-4 h-4" /> },
  { label: 'До конца недели', getValue: () => {
    const d = getEndOfWeek(new Date(), { weekStartsOn: 1 })
    d.setHours(18, 0, 0, 0)
    return d
  }, icon: <CalendarIcon className="w-4 h-4" /> },
  { label: 'Через неделю', getValue: () => addWeeks(new Date(), 1), icon: <CalendarIcon className="w-4 h-4" /> },
  { label: 'Через месяц', getValue: () => addMonths(new Date(), 1), icon: <CalendarIcon className="w-4 h-4" /> },
  { label: 'Через год', getValue: () => addYears(new Date(), 1), icon: <Moon className="w-4 h-4" /> },
]

export function DateTimePicker({ value, onChange, onClose }: DateTimePickerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('presets')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(value))
  const [selectedDate, setSelectedDate] = useState(value)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  const timeSlots = useMemo(() => generateTimeSlots(), [])

  const handlePresetClick = (preset: TimePreset) => {
    const newDate = preset.getValue()
    onChange(newDate)
    onClose?.()
  }

  const handleDateClick = (day: Date) => {
    const newDate = new Date(day)
    newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0)
    setSelectedDate(newDate)
    onChange(newDate)
  }

  const handleTimeClick = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const newDate = new Date(selectedDate)
    newDate.setHours(hours, minutes, 0, 0)
    setSelectedDate(newDate)
    onChange(newDate)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const getTimeOfDayIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0])
    if (hour >= 6 && hour < 12) return <Sun className="w-3 h-3 text-amber-500" />
    if (hour >= 12 && hour < 18) return <Sunset className="w-3 h-3 text-orange-500" />
    return <Moon className="w-3 h-3 text-indigo-400" />
  }

  return (
    <div className="bg-card rounded-2xl border shadow-xl overflow-hidden w-full max-w-md">
      {/* Навигация */}
      <div className="flex border-b bg-muted/30">
        <button
          onClick={() => setViewMode('presets')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
            viewMode === 'presets' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Пресеты
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
            viewMode === 'calendar' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Календарь
        </button>
        <button
          onClick={() => setViewMode('time')}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
            viewMode === 'time' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Время
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'presets' && (
          <motion.div
            key="presets"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            <div className="space-y-2">
              {timePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {preset.icon}
                  </div>
                  <div>
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(preset.getValue(), "d MMMM, HH:mm", { locale: ru })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {viewMode === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            {/* Заголовок месяца */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h3 className="font-semibold capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: ru })}
              </h3>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Дни месяца */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = isSameDay(day, selectedDate)
                const isDayToday = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    disabled={!isCurrentMonth}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-all",
                      "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      !isCurrentMonth && "text-muted-foreground/30 cursor-not-allowed",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                      isDayToday && !isSelected && "bg-accent text-accent-foreground",
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Выбранная дата */}
            <div className="mt-4 p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Выбрано:</p>
              <p className="font-semibold">
                {format(selectedDate, "d MMMM yyyy, HH:mm", { locale: ru })}
              </p>
            </div>
          </motion.div>
        )}

        {viewMode === 'time' && (
          <motion.div
            key="time"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-4"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </p>
              <p className="text-2xl font-bold">
                {format(selectedDate, "HH:mm")}
              </p>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-4 gap-2 pr-4">
                {timeSlots.map((time) => {
                  const isSelected = format(selectedDate, 'HH:mm') === time
                  
                  return (
                    <button
                      key={time}
                      onClick={() => handleTimeClick(time)}
                      className={cn(
                        "p-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1",
                        "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {getTimeOfDayIcon(time)}
                      {time}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка подтверждения */}
      <div className="p-4 border-t bg-muted/30">
        <Button 
          onClick={onClose} 
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          Подтвердить
        </Button>
      </div>
    </div>
  )
}

