"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Plus, 
  Users,
  ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BartenderStats } from '@/components/stats/BartenderStats'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTasks } from '@/contexts/TaskContext'
import type { User } from '@/types/database'

interface TeamViewProps {
  onCreateTaskForBartender: (bartenderId: string) => void
}

export function TeamView({ onCreateTaskForBartender }: TeamViewProps) {
  const { bartenders, getStats, getTasksForUser, completeTask, updateTask } = useTasks()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBartender, setSelectedBartender] = useState<User | null>(null)

  const filteredBartenders = bartenders.filter(b => {
    const query = searchQuery.toLowerCase()
    return (
      b.first_name.toLowerCase().includes(query) ||
      b.last_name?.toLowerCase().includes(query) ||
      b.username?.toLowerCase().includes(query)
    )
  })

  const handleBartenderClick = (bartender: User) => {
    setSelectedBartender(bartender)
  }

  const handleBack = () => {
    setSelectedBartender(null)
  }

  // Вид детальной информации о бармене
  if (selectedBartender) {
    const stats = getStats(selectedBartender.id)
    const tasks = getTasksForUser(selectedBartender.id)
    const pendingTasks = tasks.filter(t => t.status !== 'completed')

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6 pb-24"
      >
        {/* Кнопка назад */}
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Назад к команде
        </Button>

        {/* Профиль */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-primary/20">
                <AvatarImage src={selectedBartender.photo_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {selectedBartender.first_name[0]}{selectedBartender.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedBartender.first_name} {selectedBartender.last_name}
                </h2>
                {selectedBartender.username && (
                  <p className="text-muted-foreground">@{selectedBartender.username}</p>
                )}
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-4 gap-4 mt-6 text-center">
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Готово</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Ожидает</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Просрочено</p>
              </div>
            </div>

            {/* Кнопка создания задачи */}
            <Button 
              onClick={() => onCreateTaskForBartender(selectedBartender.id)}
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Назначить задачу
            </Button>
          </CardContent>
        </Card>

        {/* Текущие задачи */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Текущие задачи ({pendingTasks.length})</h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={completeTask}
                    onStartProgress={(id) => updateTask(id, { status: 'in_progress' })}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  Нет активных задач
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    )
  }

  // Список барменов
  return (
    <div className="space-y-4 pb-24">
      {/* Поиск */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </motion.div>

      {/* Список барменов */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <AnimatePresence>
          {filteredBartenders.length > 0 ? (
            filteredBartenders.map((bartender, index) => (
              <motion.div
                key={bartender.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BartenderStats
                  bartender={bartender}
                  stats={getStats(bartender.id)}
                  onClick={() => handleBartenderClick(bartender)}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">Нет барменов</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Бармены появятся после регистрации'
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

