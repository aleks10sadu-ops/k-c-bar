-- Включаем Realtime для таблиц tasks и users
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Включаем публикацию для realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Или используйте Supabase Dashboard:
-- Database → Replication → supabase_realtime → добавьте таблицы tasks и users

