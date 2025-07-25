FROM node:22

WORKDIR /app

# Копируем package.json и package-lock.json
COPY *.json ./
COPY .npmrc ./

ARG GITHUB_TOKEN

RUN echo "@metastate-is:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# Устанавливаем зависимости
RUN npm ci
# Копируем исходники
COPY . .

# Собираем приложение
RUN npm run build

# Инициализируем базу данных Neo4j
RUN npm run cli init-neo4j

CMD ["npm", "run", "start:prod"]
