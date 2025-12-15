"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Save, Shield, Coffee } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

// Проверяем наличие Supabase
const hasSupabase = typeof process !== 'undefined' && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, isAdmin, refreshUser } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!user || !firstName.trim()) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      if (hasSupabase) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { error } = await supabase
          .from('users')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim() || null,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', user.id)

        if (!error) {
          // Обновляем данные пользователя в контексте
          await refreshUser()
        }
      }

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error updating profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Оверлей */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          
          {/* Модальное окно */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 bg-gray-900 border border-gray-800 rounded-2xl z-50 overflow-hidden"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Профиль</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Контент */}
            <div className="p-6">
              {/* Аватар и роль */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className="w-20 h-20 mb-3 ring-2 ring-amber-500/50">
                  <AvatarImage src={user.photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xl font-bold">
                    {initials || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  isAdmin 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {isAdmin ? (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      Старший Бармен
                    </>
                  ) : (
                    <>
                      <Coffee className="w-3.5 h-3.5" />
                      Бармен
                    </>
                  )}
                </div>

                {user.username && (
                  <p className="text-gray-500 text-sm mt-2">@{user.username}</p>
                )}
              </div>

              {/* Форма редактирования */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Имя *
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Введите имя"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Фамилия
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Введите фамилию"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Кнопка сохранения */}
              <div className="mt-6">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !firstName.trim()}
                  className={`w-full ${
                    saveSuccess 
                      ? 'bg-green-600 hover:bg-green-600' 
                      : 'bg-amber-500 hover:bg-amber-600'
                  } text-black font-medium`}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                      />
                      Сохранение...
                    </span>
                  ) : saveSuccess ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        ✓
                      </motion.div>
                      Сохранено!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Сохранить изменения
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
