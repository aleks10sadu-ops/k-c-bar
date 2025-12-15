"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Users, 
  BarChart3, 
  Plus,
  ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { hapticFeedback } from '@/lib/telegram'

type NavItem = 'home' | 'tasks' | 'team' | 'stats'

interface NavigationProps {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  onCreateTask: () => void
}

export function Navigation({ activeItem, onNavigate, onCreateTask }: NavigationProps) {
  const { isAdmin } = useAuth()

  const handleNavigate = (item: NavItem) => {
    hapticFeedback('light')
    onNavigate(item)
  }

  const handleCreate = () => {
    hapticFeedback('medium')
    onCreateTask()
  }

  const navItems = [
    { id: 'home' as NavItem, label: 'Главная', icon: Home },
    { id: 'tasks' as NavItem, label: 'Задачи', icon: ClipboardList },
    ...(isAdmin ? [{ id: 'team' as NavItem, label: 'Команда', icon: Users }] : []),
    ...(isAdmin ? [{ id: 'stats' as NavItem, label: 'Статистика', icon: BarChart3 }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t safe-area-bottom">
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 2).map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeItem === item.id}
              onClick={() => handleNavigate(item.id)}
            />
          ))}

          {/* Кнопка создания */}
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="relative -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center text-white"
            >
              <Plus className="w-6 h-6" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 animate-ping opacity-20" />
            </motion.button>
          )}

          {navItems.slice(2).map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeItem === item.id}
              onClick={() => handleNavigate(item.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}

interface NavButtonProps {
  icon: React.ElementType
  label: string
  isActive: boolean
  onClick: () => void
}

function NavButton({ icon: Icon, label, isActive, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors relative",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <motion.div
        initial={false}
        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <Icon className="w-6 h-6" />
      </motion.div>
      <span className="text-xs font-medium">{label}</span>
      
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-2 w-1 h-1 rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  )
}

