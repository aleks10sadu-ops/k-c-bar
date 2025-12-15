import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message are required' },
        { status: 400 }
      )
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN not configured, skipping notification')
      return NextResponse.json({ success: true, demo: true })
    }

    // Получаем telegram_id пользователя из Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: true, demo: true })
    }

    // Получаем данные пользователя
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=telegram_id,first_name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    )

    const users = await userResponse.json()
    
    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const telegramId = users[0].telegram_id

    // Отправляем уведомление через Telegram Bot API
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `🍸 Bar Tracker\n\n${message}`,
          parse_mode: 'HTML',
        }),
      }
    )

    const telegramResult = await telegramResponse.json()

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult)
      // Не возвращаем ошибку - уведомление в приложении всё равно будет показано
      return NextResponse.json({ success: true, telegram: false })
    }

    return NextResponse.json({ success: true, telegram: true })
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return NextResponse.json({ success: true, telegram: false })
  }
}

