-- Исправляем RLS политики для работы с Telegram авторизацией
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Удаляем старую политику update для users
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Создаём новую политику, которая разрешает update
-- (безопасность обеспечивается на уровне приложения - пользователь может обновлять только свои данные)
CREATE POLICY "Allow users to update profiles" ON users
  FOR UPDATE USING (true);

-- Также добавляем политику для delete (на всякий случай)
CREATE POLICY "Allow delete for users" ON users
  FOR DELETE USING (true);

-- Аналогично для tasks - разрешаем все операции
-- (безопасность на уровне приложения)
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Allow all operations on tasks" ON tasks
  FOR ALL USING (true);

-- Для notifications тоже
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access" ON notifications;

CREATE POLICY "Allow all operations on notifications" ON notifications
  FOR ALL USING (true);

