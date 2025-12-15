"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTelegramUser, getTelegramWebApp, type WebAppUser } from '@/lib/telegram'
import type { User, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  telegramUser: WebAppUser | null
  isLoading: boolean
  isAdmin: boolean
  error: string | null
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Демо пользователь для разработки
const demoUser: User = {
  id: 'demo-user',
  telegram_id: 123456789,
  username: 'demo_admin',
  first_name: 'Демо',
  last_name: 'Админ',
  photo_url: null,
  role: 'admin' as UserRole,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [telegramUser, setTelegramUser] = useState<WebAppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initializeUser = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Получаем данные пользователя Telegram
      const tgUser = getTelegramUser()
      
      // Для разработки создаём тестового пользователя если нет Telegram
      const userData = tgUser || {
        id: 123456789,
        first_name: 'Демо',
        last_name: 'Админ',
        username: 'demo_admin',
      }

      setTelegramUser(userData)

      // Проверяем наличие Supabase переменных
      const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

      if (!hasSupabase) {
        // Демо режим
        console.log('🍸 Bar Tracker запущен в демо-режиме')
        setUser(demoUser)
        
        // Инициализируем Telegram WebApp если есть
        const webApp = getTelegramWebApp()
        if (webApp) {
          webApp.ready()
          webApp.expand()
        }
        return
      }

      const supabase = createClient()

      // Ищем или создаём пользователя в базе
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userData.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('Database error, using demo mode:', fetchError.message)
        setUser(demoUser)
        return
      }

      if (existingUser) {
        setUser(existingUser)
      } else {
        // Создаём нового пользователя (первый пользователь = админ)
        const { data: usersCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })

        const isFirstUser = !usersCount || usersCount.length === 0

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            telegram_id: userData.id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            photo_url: userData.photo_url,
            role: isFirstUser ? 'admin' : 'bartender',
          })
          .select()
          .single()

        if (insertError) {
          console.warn('Insert error, using demo mode:', insertError.message)
          setUser(demoUser)
          return
        }

        setUser(newUser)
      }

      // Инициализируем Telegram WebApp
      const webApp = getTelegramWebApp()
      if (webApp) {
        webApp.ready()
        webApp.expand()
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка авторизации')
      
      // Создаём демо-пользователя при ошибке
      setUser(demoUser)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!user?.id || user.id === 'demo-user') return

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!fetchError && data) {
      setUser(data)
    }
  }, [user?.id])

  useEffect(() => {
    initializeUser()
  }, [initializeUser])

  const value: AuthContextType = {
    user,
    telegramUser,
    isLoading,
    isAdmin: user?.role === 'admin',
    error,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
