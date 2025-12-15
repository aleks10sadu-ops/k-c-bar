import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} в ${formatTime(date)}`
}

export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 0) {
    const absDays = Math.abs(days)
    if (absDays === 0) return 'Просрочено сегодня'
    if (absDays === 1) return 'Просрочено вчера'
    return `Просрочено ${absDays} дн. назад`
  }

  if (minutes < 60) return `Через ${minutes} мин.`
  if (hours < 24) return `Через ${hours} ч.`
  if (days === 1) return 'Завтра'
  if (days < 7) return `Через ${days} дн.`
  if (days < 30) return `Через ${Math.floor(days / 7)} нед.`
  return `Через ${Math.floor(days / 30)} мес.`
}

export function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

