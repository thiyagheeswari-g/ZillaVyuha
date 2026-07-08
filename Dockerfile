# Build Frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Build Backend
FROM python:3.12-slim

RUN pip install --no-cache-dir uv==0.8.13

WORKDIR /code

# Copy backend dependencies
COPY zillavyuha/pyproject.toml zillavyuha/README.md zillavyuha/uv.lock* ./

# Install backend dependencies
RUN uv sync --frozen

# Copy backend source code
COPY zillavyuha/zillavyuha ./zillavyuha

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist /code/app/static

ARG COMMIT_SHA=""
ENV COMMIT_SHA=${COMMIT_SHA}

ARG AGENT_VERSION=0.0.0
ENV AGENT_VERSION=${AGENT_VERSION}

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uv run uvicorn zillavyuha.fast_api_app:app --host 0.0.0.0 --port ${PORT}"]
