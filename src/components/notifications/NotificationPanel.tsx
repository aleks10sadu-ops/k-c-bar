"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck, Trash2, ClipboardCheck, ClipboardList, Clock, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export function NotificationPanel() {
  const { 
    notifications, 
    isOpen, 
    setIsOpen, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    unreadCount,
    openTaskFromNotification
  } = useNotifications()

  const handleNotificationClick = (notification: { id: string; taskId?: string }) => {
    markAsRead(notification.id)
    
    // Если есть привязанная задача - открываем её
    if (notification.taskId) {
      openTaskFromNotification(notification.taskId)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return <ClipboardList className="w-4 h-4 text-blue-400" />
      case 'task_completed':
        return <CheckCheck className="w-4 h-4 text-green-400" />
      case 'task_updated':
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <Bell className="w-4 h-4 text-gray-400" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'Только что'
    if (minutes < 60) return `${minutes} мин. назад`
    if (hours < 24) return `${hours} ч. назад`
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Оверлей */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Панель уведомлений - слева сверху */}
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-gray-900 border-r border-gray-800 z-50 flex flex-col"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Уведомления</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-500 text-black rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Действия */}
            {notifications.length > 0 && (
              <div className="flex gap-2 p-3 border-b border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-gray-400 hover:text-white flex-1"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Прочитать все
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-red-400 flex-1"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Очистить
                </Button>
              </div>
            )}

            {/* Список уведомлений */}
            <ScrollArea className="flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500">
                  <Bell className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Нет уведомлений</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.read 
                          ? 'bg-gray-900/50' 
                          : 'bg-gray-800/50 hover:bg-gray-800'
                      } ${notification.taskId ? 'hover:bg-amber-900/20' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium ${
                              notification.read ? 'text-gray-400' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {notification.taskId && (
                          <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

