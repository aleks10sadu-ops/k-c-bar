"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { User } from '@/types/database'
import type { TaskStats } from '@/contexts/TaskContext'

interface BartenderStatsProps {
  bartender: User
  stats: TaskStats
  onClick?: () => void
}

export function BartenderStats({ bartender, stats, onClick }: BartenderStatsProps) {
  const initials = `${bartender.first_name[0]}${bartender.last_name?.[0] || ''}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-md transition-all duration-200"
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Аватар */}
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarImage src={bartender.photo_url || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Имя и юзернейм */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">
                  {bartender.first_name} {bartender.last_name}
                </h3>
                {bartender.username && (
                  <span className="text-sm text-muted-foreground">
                    @{bartender.username}
                  </span>
                )}
              </div>

              {/* Прогресс бар */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">Выполнено</span>
                  <span className="text-sm font-medium">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-2" />
              </div>

              {/* Статистика */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {stats.completed}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {stats.pending + stats.inProgress}
                </Badge>
                {stats.overdue > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.overdue}
                  </Badge>
                )}
                {stats.averageCompletionTime && (
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    ~{stats.averageCompletionTime} мин
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

