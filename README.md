# Spectra - Система управления репутацией и взаимодействием

## Описание

Spectra - это микросервис для управления репутацией и взаимодействием между участниками платформы. Система поддерживает как on-chain (блокчейн), так и off-chain метрики репутации.

### Основные возможности:
- Обработка on-chain и off-chain метрик репутации
- Интеграция с Kafka для обработки событий
- Хранение данных в Neo4j
- Поддержка Protobuf для сериализации сообщений
- Структурированное логирование
- Мониторинг состояния системы
- REST API для взаимодействия с метриками репутации

## Установка и запуск

### Предварительные требования

- Node.js 20.x или выше
- Neo4j 4.x
- Kafka
- Docker (для развертывания)

### Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/spectra/spectra.git
cd spectra
```

2. Установите зависимости:
```bash
npm install
```

3. Скопируйте файл конфигурации:
```bash
cp .env.example .env
```

### Запуск разработки

```bash
# В режиме разработки с hot-reload
npm run start:dev

# В режиме разработки с отладкой
npm run start:debug
```

### Сборка и запуск в продакшене

```bash
# Сборка
npm run build

# Запуск
npm run start:prod
```

## Архитектура

### Основные компоненты

1. **Core (Ядро)**
   - `kafka`: Интеграция с Kafka для обработки сообщений
   - `logger`: Система логирования
   - `neo4j`: Интеграция с Neo4j для хранения данных

2. **Модули**
   - `onchain`: Обработка on-chain метрик
   - `offchain`: Обработка off-chain метрик
   - `events`: Обработчик событий из Kafka

3. **Утилиты**
   - `validations`: Валидация типов метрик

## API

Документация API доступна по адресу: http://localhost:3004/api

### Точки входа

- `GET /api/health` - Проверка состояния сервиса
- `POST /api/marks` - Создание метки репутации
- `GET /api/marks/{id}` - Получение метки по ID
- `GET /api/participants/{id}/marks` - Получение меток участника

## Интеграция с Kafka

### Поддерживаемые топики

- `citadel.mark.created.v1` - Создание метки репутации

### Пример сообщения

```typescript
interface MarkCreate {
  id: string;
  createdAt: Timestamp;
  fromParticipantId: string;
  toParticipantId: string;
  isOnchain: boolean;
  offchainMarkType?: OffchainMarkType;
  onchainMarkType?: OnchainMarkType;
  value: boolean;
  metadata: {
    eventId: string;
    schemaVersion: string;
  };
}
```

## Тестирование

### Типы тестов

1. Unit-тесты
2. E2E тесты
3. Тесты производительности

### Запуск тестов

```bash
# Unit-тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## Деплой

### Docker

Для деплоя доступен Dockerfile:

```bash
# Сборка Docker образа
docker build -t spectra .

# Запуск контейнера
docker run -d -p 3004:3004 --env-file .env spectra
```

### Helm

Для деплоя в Kubernetes используйте Helm чарт:

```bash
# Установка
helm install spectra ./helm/spectra

# Обновление
helm upgrade spectra ./helm/spectra
```

### Docker Compose

Для локального развертывания можно использовать docker-compose:

```bash
docker-compose up -d
```

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.

## Связь

- GitHub: https://github.com/spectra