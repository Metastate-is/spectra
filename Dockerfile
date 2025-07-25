# Этап сборки (builder)
FROM node:20-slim AS builder

WORKDIR /app

# Копируем package.json, package-lock.json и .npmrc
COPY package*.json ./
COPY .npmrc ./

# Аргумент для токена GitHub Packages
ARG GITHUB_TOKEN
# Настраиваем .npmrc с токеном, если он предоставлен
RUN if [ -n "$GITHUB_TOKEN" ]; then \
    sed -i "s/\${GITHUB_TOKEN}/$GITHUB_TOKEN/" .npmrc; \
    fi

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники
COPY . .

# Собираем приложение (Nest build генерирует dist)
RUN npm run build

# Производственный этап (production)
FROM node:20-slim AS production

WORKDIR /app

# Создаем непривилегированного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Копируем собранное приложение и зависимости из этапа сборки
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Копируем entrypoint скрипт и делаем его исполняемым (перед сменой пользователя)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Указываем пользователя (non-root)
USER nestjs

# Устанавливаем переменные окружения (добавьте свои, если нужно; в K8s они из configmap)
ENV NODE_ENV=production
ENV KAFKA_DISABLED=false

# ENTRYPOINT для init и запуска
ENTRYPOINT ["/app/entrypoint.sh"]
