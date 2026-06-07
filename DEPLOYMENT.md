Production deployment checklist

1. Required environment variables

- ENV=production
- SUPABASE_URL
- SUPABASE_SERVICE_KEY (required in production)
- REDIS_URL (or CELERY_BROKER_URL) with auth
- DATABASE_URL (if using direct DB connections)
- SETTINGS_ADMIN_KEY (optional for development only; not used in production)
- SENTRY_DSN (optional)

2. Running services

- Backend: run via Uvicorn/Gunicorn with ASGI wrapper: e.g.

  c:/python314/python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

- Frontend: build and deploy the Next.js app (do not run dev server in production):

  cd frontend
  npm install
  npm run build
  npm run start

- Celery workers: start workers with the same Python environment and ensure REDIS_URL is set with authentication

  celery -A backend.workers.celery_app.celery worker --loglevel=info

3. Database migrations

- Run migrations before application startup. Migrations are under backend/migrations/.
- Ensure backups and rollback plan are available.

4. Secrets and configuration

- Do NOT store secrets in repository or in an HTTP-accessible .env.
- For production, use a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, or platform env vars).
- The `/api/settings` POST endpoint is disabled in production; use your deployment pipeline to update config.

5. Monitoring & observability

- Configure Sentry or similar using SENTRY_DSN.
- Export metrics to Prometheus or a hosted metrics provider.

6. Security hardening

- Ensure TLS termination (load balancer or reverse proxy)
- Limit CORS origins to known frontend URLs
- Ensure SUPABASE_SERVICE_KEY and REDIS auth keys are rotated and stored securely

7. CI/CD suggestions

- Run `pytest` and the smoke tests on every PR
- Use pinned requirements (see backend/requirements-pinned.txt) to get deterministic installs

8. Rollout

- Deploy to a staging environment first and run integration tests, including end-to-end job flows and background workers.

