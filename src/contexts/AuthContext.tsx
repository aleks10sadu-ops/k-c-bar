"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getTelegramUser, getTelegramWebApp, type WebAppUser } from '@/lib/telegram'
import type { User, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  telegramUser: WebAppUser | null
  isLoading: boolean
  isAdmin: boolean
  error: string | null
  refreshUser: () => Promise<void>
  logout: () => void
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

// Проверяем наличие Supabase в build time
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

      // Если нет Supabase - используем демо режим
      if (!hasSupabase) {
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

      // Динамически импортируем Supabase клиент только если он нужен
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Ищем пользователя в базе
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
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })

        const isFirstUser = !count || count === 0

        const newUserData = {
          telegram_id: userData.id,
          username: userData.username || null,
          first_name: userData.first_name,
          last_name: userData.last_name || null,
          photo_url: userData.photo_url || null,
          role: (isFirstUser ? 'admin' : 'bartender') as UserRole,
        }

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert(newUserData as never)
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
    if (!user?.id || user.id === 'demo-user' || !hasSupabase) return

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!fetchError && data) {
        setUser(data)
      }
    } catch (err) {
      console.error('Refresh user error:', err)
    }
  }, [user?.id])

  const logout = useCallback(() => {
    setUser(null)
    setTelegramUser(null)
    // Перезагружаем страницу для полного сброса
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [])

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
    logout,
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
