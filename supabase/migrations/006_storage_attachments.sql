-- Настройка Storage для хранения файлов
-- Выполните эту миграцию в SQL Editor в Supabase Dashboard

-- Создаём публичный бакет для вложений
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments', 
  'attachments', 
  true,
  52428800, -- 50MB лимит
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800;

-- Политики доступа для Storage

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes from attachments" ON storage.objects;

-- Разрешаем всем читать файлы из бакета attachments
CREATE POLICY "Allow all reads from attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments');

-- Разрешаем всем загружать файлы в бакет attachments
CREATE POLICY "Allow all uploads to attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments');

-- Разрешаем всем обновлять файлы в бакете attachments
CREATE POLICY "Allow all updates to attachments" ON storage.objects
  FOR UPDATE USING (bucket_id = 'attachments');

-- Разрешаем всем удалять файлы из бакета attachments
CREATE POLICY "Allow all deletes from attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments');

