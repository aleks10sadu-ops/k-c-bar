-- Добавляем систему шаблонов задач
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Создаем таблицы только если они не существуют
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS task_template_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type task_type,
  steps text[],
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Индексы для оптимизации (создаем только если не существуют)
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON task_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_task_template_items_template_id ON task_template_items(template_id);

-- Создаем триггеры только если они не существуют
DO $$
BEGIN
    -- Проверяем и создаем триггер для task_templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_task_templates_updated_at'
        AND tgrelid = 'task_templates'::regclass
    ) THEN
        CREATE TRIGGER update_task_templates_updated_at
          BEFORE UPDATE ON task_templates
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Проверяем и создаем триггер для task_template_items
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_task_template_items_updated_at'
        AND tgrelid = 'task_template_items'::regclass
    ) THEN
        CREATE TRIGGER update_task_template_items_updated_at
          BEFORE UPDATE ON task_template_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS (Row Level Security) - включаем только если еще не включено
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;

-- Создаем политики только если они не существуют
DO $$
BEGIN
    -- Политики для шаблонов
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Users can view task templates') THEN
        CREATE POLICY "Users can view task templates"
          ON task_templates FOR SELECT
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Users can create task templates') THEN
        CREATE POLICY "Users can create task templates"
          ON task_templates FOR INSERT
          WITH CHECK (
            created_by::text = auth.uid()::text OR
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id::text = auth.uid()::text
              AND users.role = 'admin'
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Users can update task templates') THEN
        CREATE POLICY "Users can update task templates"
          ON task_templates FOR UPDATE
          USING (
            created_by::text = auth.uid()::text OR
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id::text = auth.uid()::text
              AND users.role = 'admin'
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Users can delete task templates') THEN
        CREATE POLICY "Users can delete task templates"
          ON task_templates FOR DELETE
          USING (
            created_by::text = auth.uid()::text OR
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id::text = auth.uid()::text
              AND users.role = 'admin'
            )
          );
    END IF;

    -- Политики для элементов шаблона
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Users can view task template items') THEN
        CREATE POLICY "Users can view task template items"
          ON task_template_items FOR SELECT
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Users can create task template items') THEN
        CREATE POLICY "Users can create task template items"
          ON task_template_items FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM task_templates
              WHERE task_templates.id = template_id
              AND (
                task_templates.created_by::text = auth.uid()::text OR
                EXISTS (
                  SELECT 1 FROM users
                  WHERE users.id::text = auth.uid()::text
                  AND users.role = 'admin'
                )
              )
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Users can update task template items') THEN
        CREATE POLICY "Users can update task template items"
          ON task_template_items FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM task_templates
              WHERE task_templates.id = template_id
              AND (
                task_templates.created_by::text = auth.uid()::text OR
                EXISTS (
                  SELECT 1 FROM users
                  WHERE users.id::text = auth.uid()::text
                  AND users.role = 'admin'
                )
              )
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Users can delete task template items') THEN
        CREATE POLICY "Users can delete task template items"
          ON task_template_items FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM task_templates
              WHERE task_templates.id = template_id
              AND (
                task_templates.created_by::text = auth.uid()::text OR
                EXISTS (
                  SELECT 1 FROM users
                  WHERE users.id::text = auth.uid()::text
                  AND users.role = 'admin'
                )
              )
            )
          );
    END IF;
END $$;

-- Анонимный доступ для демо (создаем только если не существуют)
DO $$
BEGIN
    -- Политики для шаблонов
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow anonymous read task templates for demo') THEN
        CREATE POLICY "Allow anonymous read task templates for demo"
          ON task_templates FOR SELECT TO anon
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow anonymous insert task templates for demo') THEN
        CREATE POLICY "Allow anonymous insert task templates for demo"
          ON task_templates FOR INSERT TO anon
          WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow anonymous update task templates for demo') THEN
        CREATE POLICY "Allow anonymous update task templates for demo"
          ON task_templates FOR UPDATE TO anon
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Allow anonymous delete task templates for demo') THEN
        CREATE POLICY "Allow anonymous delete task templates for demo"
          ON task_templates FOR DELETE TO anon
          USING (true);
    END IF;

    -- Политики для элементов шаблона
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Allow anonymous read task template items for demo') THEN
        CREATE POLICY "Allow anonymous read task template items for demo"
          ON task_template_items FOR SELECT TO anon
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Allow anonymous insert task template items for demo') THEN
        CREATE POLICY "Allow anonymous insert task template items for demo"
          ON task_template_items FOR INSERT TO anon
          WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Allow anonymous update task template items for demo') THEN
        CREATE POLICY "Allow anonymous update task template items for demo"
          ON task_template_items FOR UPDATE TO anon
          USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_template_items' AND policyname = 'Allow anonymous delete task template items for demo') THEN
        CREATE POLICY "Allow anonymous delete task template items for demo"
          ON task_template_items FOR DELETE TO anon
          USING (true);
    END IF;
END $$;
