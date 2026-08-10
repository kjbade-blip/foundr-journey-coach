DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('refresh-crime-benchmarks');
SELECT cron.schedule(
  'refresh-crime-benchmarks',
  '0 3 5 * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--566ea121-7bc7-4116-92e8-c11cbe721dba.lovable.app/api/public/refresh-crime-benchmarks',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_D9iodWFqgZYARkINigeKNg_fjIahIML"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);