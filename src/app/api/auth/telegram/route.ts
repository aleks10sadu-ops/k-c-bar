import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

function validateTelegramData(initData: string, botToken: string): TelegramAuthData | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    
    if (!hash) return null

    // Удаляем hash из параметров для проверки
    urlParams.delete('hash')

    // Сортируем параметры и создаём строку для проверки
    const dataCheckArr = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)

    const dataCheckString = dataCheckArr.join('\n')

    // Создаём секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    // Проверяем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    if (calculatedHash !== hash) {
      return null
    }

    // Проверяем auth_date (не старше 24 часов)
    const authDate = parseInt(urlParams.get('auth_date') || '0')
    const now = Math.floor(Date.now() / 1000)
    
    if (now - authDate > 86400) {
      return null
    }

    // Парсим данные пользователя
    const userStr = urlParams.get('user')
    if (!userStr) return null

    const user = JSON.parse(userStr)

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      auth_date: authDate,
      hash: hash,
    }
  } catch (error) {
    console.error('Telegram validation error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json(
        { error: 'Missing initData' },
        { status: 400 }
      )
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      // В режиме разработки без токена пропускаем валидацию
      console.warn('TELEGRAM_BOT_TOKEN not set, skipping validation')
      return NextResponse.json({ valid: true, demo: true })
    }

    const userData = validateTelegramData(initData, botToken)

    if (!userData) {
      return NextResponse.json(
        { error: 'Invalid Telegram data' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: userData,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

