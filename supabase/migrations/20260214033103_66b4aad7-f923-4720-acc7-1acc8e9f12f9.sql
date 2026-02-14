
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove existing jobs if they exist (avoid duplicates)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('weekly-recurring-summaries', 'subscription-cycle-reminders');

-- 1) Weekly recurring summaries - Monday 09:00 UTC (12:00 São Paulo)
SELECT cron.schedule(
  'weekly-recurring-summaries',
  '0 12 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://iagzodcwctvydmgrwjsy.supabase.co/functions/v1/send-recurring-weekly-summaries',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZ3pvZGN3Y3R2eWRtZ3J3anN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjIzMzUsImV4cCI6MjA3MjM5ODMzNX0.tkSk6kIBKA4WH9FAn3P4Y8YufkVHUwCXZOvfBt7KHZw"}'::jsonb,
    body := '{"triggered_by": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);

-- 2) Subscription cycle reminders - Daily at 12:00 UTC (09:00 São Paulo)
SELECT cron.schedule(
  'subscription-cycle-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iagzodcwctvydmgrwjsy.supabase.co/functions/v1/subscription-cycle-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZ3pvZGN3Y3R2eWRtZ3J3anN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjIzMzUsImV4cCI6MjA3MjM5ODMzNX0.tkSk6kIBKA4WH9FAn3P4Y8YufkVHUwCXZOvfBt7KHZw"}'::jsonb,
    body := '{"triggered_by": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
