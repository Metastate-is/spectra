FROM node:22

WORKDIR /app

# Копируем package.json и package-lock.json
COPY *.json ./
COPY .npmrc ./

ARG NPM_TOKEN
# Настраиваем .npmrc с токеном, если он предоставлен
RUN if [ -n "$NPM_TOKEN" ]; then \
  sed -i "s/\${GITHUB_TOKEN}/$NPM_TOKEN/" .npmrc; \
  fi

# Устанавливаем зависимости
RUN npm ci
# Копируем исходники
COPY . .

# Собираем приложение
RUN npm run build

# Инициализируем базу данных Neo4j
RUN npm run cli init-neo4j

CMD ["npm", "run", "start:prod"]
