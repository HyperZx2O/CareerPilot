FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY backend/requirements.txt .
COPY integrations/requirements.txt integrations/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r integrations/requirements.txt groq svix

COPY backend/ backend/
COPY integrations/ integrations/

RUN addgroup --system --gid 1001 appuser && adduser --system --uid 1001 --ingroup appuser appuser
USER appuser

EXPOSE 8000

ENV ENV=production
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
