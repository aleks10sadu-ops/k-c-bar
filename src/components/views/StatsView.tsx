"use client"

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trophy,
  Target,
  Zap
} from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfDay, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatsCard } from '@/components/stats/StatsCard'
import { useTasks } from '@/contexts/TaskContext'
import { cn } from '@/lib/utils'

export function StatsView() {
  const { tasks, bartenders, getStats } = useTasks()

  const globalStats = getStats()

  // Статистика по дням за последнюю неделю
  const weeklyData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    })

    return days.map(day => {
      const dayStart = startOfDay(day)
      const completedOnDay = tasks.filter(t => 
        t.completed_at && isSameDay(new Date(t.completed_at), dayStart)
      ).length
      const createdOnDay = tasks.filter(t => 
        isSameDay(new Date(t.created_at), dayStart)
      ).length

      return {
        date: day,
        label: format(day, 'EEE', { locale: ru }),
        completed: completedOnDay,
        created: createdOnDay,
      }
    })
  }, [tasks])

  const maxValue = Math.max(...weeklyData.map(d => Math.max(d.completed, d.created)), 1)

  // Топ барменов
  const topBartenders = useMemo(() => {
    return bartenders
      .map(b => ({
        bartender: b,
        stats: getStats(b.id)
      }))
      .sort((a, b) => b.stats.completed - a.stats.completed)
      .slice(0, 3)
  }, [bartenders, getStats])

  // Распределение по типам задач
  const taskTypeDistribution = useMemo(() => {
    const types = {
      prepare: { label: 'Подготовить', count: 0, color: 'bg-blue-500' },
      check: { label: 'Проверить', count: 0, color: 'bg-emerald-500' },
      inventory: { label: 'Инвентаризация', count: 0, color: 'bg-purple-500' },
      execute: { label: 'Выполнить', count: 0, color: 'bg-amber-500' },
    }

    tasks.forEach(t => {
      if (t.task_type && types[t.task_type]) {
        types[t.task_type].count++
      }
    })

    const total = Object.values(types).reduce((sum, t) => sum + t.count, 0)

    return Object.entries(types).map(([key, value]) => ({
      ...value,
      key,
      percentage: total > 0 ? Math.round((value.count / total) * 100) : 0
    }))
  }, [tasks])

  return (
    <div className="space-y-6 pb-24">
      {/* Заголовок */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold">Статистика</h2>
        <p className="text-muted-foreground">Обзор производительности команды</p>
      </motion.div>

      {/* Основные метрики */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="Всего задач"
          value={globalStats.total}
          icon={Target}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Выполнено"
          value={globalStats.completed}
          subtitle={`${globalStats.completionRate}%`}
          icon={CheckCircle2}
          color="emerald"
          delay={0.1}
        />
        <StatsCard
          title="Просрочено"
          value={globalStats.overdue}
          icon={AlertTriangle}
          color="red"
          delay={0.2}
        />
        <StatsCard
          title="Среднее время"
          value={globalStats.averageCompletionTime ? `${globalStats.averageCompletionTime} мин` : '—'}
          icon={Zap}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* График за неделю */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Активность за неделю
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex flex-col justify-end gap-1">
                    {/* Выполнено */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.completed / maxValue) * 100}%` }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t"
                      style={{ minHeight: day.completed > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Выполнено</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Топ барменов */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Лучшие бармены
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBartenders.length > 0 ? (
              <div className="space-y-4">
                {topBartenders.map((item, index) => {
                  const medals = ['🥇', '🥈', '🥉']
                  
                  return (
                    <motion.div
                      key={item.bartender.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-2xl">{medals[index]}</span>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={item.bartender.photo_url || undefined} />
                        <AvatarFallback>
                          {item.bartender.first_name[0]}{item.bartender.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.bartender.first_name} {item.bartender.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.stats.completed} выполнено
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{item.stats.completionRate}%</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Нет данных
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Распределение по типам */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Типы задач
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskTypeDistribution.map((type, index) => (
                <motion.div
                  key={type.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", type.color)} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {type.count} ({type.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${type.percentage}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                      className={cn("h-full rounded-full", type.color)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

