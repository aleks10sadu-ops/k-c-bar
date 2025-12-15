-- Добавляем поле steps для хранения шагов задачи
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Добавляем колонку steps (массив текста)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS steps text[] DEFAULT NULL;

-- Делаем due_date nullable для примечаний и чата
ALTER TABLE tasks ALTER COLUMN due_date DROP NOT NULL;

-- Создаём bucket для хранения файлов (если не существует)
-- Это нужно сделать через Supabase Dashboard: Storage -> New bucket -> "attachments"
-- Или через SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

