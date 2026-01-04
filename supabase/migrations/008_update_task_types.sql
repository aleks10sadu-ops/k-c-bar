-- Обновляем типы задач: добавляем 'urgent' и 'normal', если их нет
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Безопасно добавляем новые значения enum
DO $$
DECLARE
    enum_values TEXT[] := ARRAY['prepare', 'check', 'urgent', 'normal'];
    current_value TEXT;
BEGIN
    FOREACH current_value IN ARRAY enum_values
    LOOP
        -- Проверяем, существует ли значение
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'task_type' AND e.enumlabel = current_value
        ) THEN
            -- Добавляем значение, если его нет
            EXECUTE 'ALTER TYPE task_type ADD VALUE ''' || current_value || '''';
        END IF;
    END LOOP;
END $$;

-- Обновляем существующие записи 'execute' на 'urgent'
UPDATE tasks SET task_type = 'urgent' WHERE task_type = 'execute';

-- Обновляем комментарий к типу
COMMENT ON TYPE task_type IS 'Типы задач: prepare (подготовить), check (проверить), urgent (срочно), normal (не срочно)';
