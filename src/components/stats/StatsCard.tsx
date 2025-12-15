"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red'
  delay?: number
}

const colorVariants = {
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500',
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-pink-500',
  red: 'from-red-500 to-rose-500',
}

const iconBgVariants = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'amber',
  delay = 0 
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm"
    >
      {/* Декоративный градиент */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2",
        `bg-gradient-to-br ${colorVariants[color]}`
      )} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <motion.p 
              className="text-3xl font-bold mt-1"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.2, type: 'spring' }}
            >
              {value}
            </motion.p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className={cn(
            "p-3 rounded-xl",
            iconBgVariants[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>

        {trend && (
          <div className="mt-3 flex items-center gap-1">
            <span className={cn(
              "text-sm font-medium",
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">за неделю</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

