# ReputationStorage Contract

## Обзор
`ReputationStorage` - это смарт-контракт, реализованный на Solidity, который предоставляет функционал для хранения и управления репутационными метками (оценками) между участниками системы.

## Основные возможности

1. **Хранение репутационных меток**
   - Каждая метка содержит:
     - `fromParticipantId` - идентификатор участника, который поставил оценку (тип `bytes32`)
     - `toParticipantId` - идентификатор участника, которому поставили оценку (тип `bytes32`)
     - `value` - булево значение оценки (true/false)
     - `markType` - тип метки в формате `bytes32` (например, "trust", "reliability")
   - Все строковые значения хранятся как `bytes32` для оптимизации газа
   - Поддерживается подсчет меток как в общем, так и по типам

2. **Управление метками**
   - Автоматическое обновление существующих меток
   - Проверка существования меток
   - Получение меток по параметрам
   - Подсчет общего количества меток
   - Подсчет количества меток по типам

3. **События**
   - `MarkStored` - вызывается при создании новой метки
   - `MarkUpdated` - вызывается при обновлении существующей метки

## Примеры использования

### 1. Создание/обновление метки
```javascript
// Импортируем утилиты из ethers
const { ethers } = require('ethers');

// Конвертируем строки в bytes32
const fromId = ethers.utils.formatBytes32String("user1");
const toId = ethers.utils.formatBytes32String("user2");
const markType = ethers.utils.formatBytes32String("trust");

// Создаем новую метку
await contract.storeOrUpdateMark(fromId, toId, true, markType);

// Обновляем существующую метку
await contract.storeOrUpdateMark(fromId, toId, false, markType);
```

### 2. Получение метки
```javascript
// Конвертируем строки в bytes32
const fromId = ethers.utils.formatBytes32String("user1");
const toId = ethers.utils.formatBytes32String("user2");
const markType = ethers.utils.formatBytes32String("trust");

// Получаем метку
const mark = await contract.getMark(fromId, toId, markType);

// Конвертируем bytes32 обратно в строку для вывода
console.log({
  fromParticipantId: ethers.utils.parseBytes32String(mark.fromParticipantId),
  toParticipantId: ethers.utils.parseBytes32String(mark.toParticipantId),
  value: mark.value,
  markType: ethers.utils.parseBytes32String(mark.markType)
});
```

### 3. Получение количества меток
```javascript
// Получение общего количества всех меток
const totalCount = await contract.getMarksCount();
console.log(`Всего меток: ${totalCount}`);

// Получение количества меток по типу
const markType = ethers.utils.formatBytes32String("trust");
const trustMarksCount = await contract.getMarksCountByType(markType);
console.log(`Меток типа 'trust': ${trustMarksCount}`);
```

## Use Cases

### 1. Система отзывов
Пользователи могут оставлять друг другу отзывы, при этом повторные отзывы от одного пользователя будут обновляться, а не создавать дубликаты.

### 2. Оценка надежности
Участники могут оценивать надежность друг друга в рамках совместных проектов.

### 3. Верификация пользователей
Проверенные пользователи могут подтверждать личность других пользователей.

## Ограничения

1. Все строковые значения хранятся как `bytes32`, что ограничивает длину строки 32 байтами.
2. Нет встроенного механизма удаления меток.
3. Нет ограничений на создание меток (все могут создавать метки всем).
4. При передаче строк длиннее 32 байт они будут обрезаны до 32 байт.

## Безопасность
- Контракт использует `calldata` для строковых параметров, что экономит газ
- Все поля структуры `Mark` являются публичными
- Отсутствуют модификаторы доступа, все функции доступны для вызова любым пользователем

## Развертывание
Для развертывания контракта используйте любой инструмент для работы с Ethereum (Hardhat, Truffle и т.д.).

## Автор
Разработано командой Spectra.
