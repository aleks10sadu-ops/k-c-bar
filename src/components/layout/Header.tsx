"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Bell, Settings, Wine } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useTasks } from '@/contexts/TaskContext'

export function Header() {
  const { user, isAdmin } = useAuth()
  const { getOverdueTasks } = useTasks()
  
  const overdueTasks = getOverdueTasks()
  const initials = user ? `${user.first_name[0]}${user.last_name?.[0] || ''}` : 'U'

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b safe-area-top">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Логотип и приветствие */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"
            >
              <Wine className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg"
              >
                {getGreeting()}, {user?.first_name}!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs text-muted-foreground"
              >
                {isAdmin ? 'Старший Бармен' : 'Бармен'}
              </motion.p>
            </div>
          </div>

          {/* Действия */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {overdueTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {overdueTasks.length}
                </span>
              )}
            </Button>
            
            <Avatar className="w-9 h-9 border-2 border-primary/20">
              <AvatarImage src={user?.photo_url || undefined} />
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 22) return 'Добрый вечер'
  return 'Доброй ночи'
}

