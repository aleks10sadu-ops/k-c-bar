-- Таблица уведомлений
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Создаём таблицу notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('task_created', 'task_completed', 'task_updated', 'note_created')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  sent_to_telegram BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Включаем RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
-- Пользователи видят только свои уведомления
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text OR user_id IN (
    SELECT id FROM users WHERE telegram_id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
      0
    )
  ));

-- Для anon/service role - полный доступ (для демо и серверных операций)
CREATE POLICY "Service role full access" ON notifications
  FOR ALL USING (true);

-- Включаем Realtime для notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Комментарии
COMMENT ON TABLE notifications IS 'Уведомления для пользователей';
COMMENT ON COLUMN notifications.type IS 'Тип уведомления: task_created, task_completed, task_updated, note_created';
COMMENT ON COLUMN notifications.sent_to_telegram IS 'Было ли уведомление отправлено в Telegram';

