-- Schedule the booking reminders cron job to run every 5 minutes
SELECT cron.schedule(
  'send-booking-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://iagzodcwctvydmgrwjsy.supabase.co/functions/v1/send-booking-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZ3pvZGN3Y3R2eWRtZ3J3anN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MjIzMzUsImV4cCI6MjA3MjM5ODMzNX0.tkSk6kIBKA4WH9FAn3P4Y8YufkVHUwCXZOvfBt7KHZw"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
  $$
);