-- Добавляем поля для результатов выполнения задач
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_text TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_file_url TEXT;

-- Комментарии к полям
COMMENT ON COLUMN tasks.result_text IS 'Текстовый результат выполнения задачи';
COMMENT ON COLUMN tasks.result_file_url IS 'URL файла с результатом выполнения задачи';

