-- Создание типов
CREATE TYPE user_role AS ENUM ('admin', 'bartender');
CREATE TYPE action_type AS ENUM ('task', 'chat', 'note');
CREATE TYPE task_type AS ENUM ('prepare', 'check', 'inventory', 'execute');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

-- Таблица пользователей
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  photo_url TEXT,
  role user_role DEFAULT 'bartender' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Таблица задач
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  action_type action_type NOT NULL,
  task_type task_type,
  status task_status DEFAULT 'pending' NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для пользователей
-- Все могут читать профили
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Разрешаем вставку новых пользователей
CREATE POLICY "Allow insert for new users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Политики безопасности для задач
-- Админы видят все задачи, бармены только свои
CREATE POLICY "Users can view tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
    OR assigned_to::text = auth.uid()::text
  );

-- Только админы могут создавать задачи
CREATE POLICY "Admins can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Админы могут обновлять все, бармены только свои задачи (статус)
CREATE POLICY "Users can update tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
    OR assigned_to::text = auth.uid()::text
  );

-- Только админы могут удалять задачи
CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Включаем анонимный доступ для Telegram Mini App
-- В продакшене используйте проверку telegram init data
CREATE POLICY "Allow anonymous read for demo"
  ON users FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert for demo"
  ON users FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read tasks for demo"
  ON tasks FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert tasks for demo"
  ON tasks FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update tasks for demo"
  ON tasks FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anonymous delete tasks for demo"
  ON tasks FOR DELETE TO anon
  USING (true);

