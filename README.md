# TurMax — туристический портал Кыргызстана

Практическая часть дипломной работы «Разработка веб-системы „ТурМакс“».
Портал объединяет направления, достопримечательности, каталог маршрутов местных операторов, интерактивную карту,
журнал и **конструктор маршрута с автоматическим расчётом стоимости** (п. 2.6 диплома), заявки операторам и кабинеты для трёх ролей.

| Часть | Технологии |
|---|---|
| Backend | ASP.NET Core Web API (.NET 8), C#, Entity Framework Core 8 (Code First), Microsoft SQL Server, JWT, Swagger |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Leaflet + OpenStreetMap |
| Тесты | xUnit: расчёт сметы (контрольный пример табл. 2.7), переходы статусов заявки |

Анализ глав диплома, архитектура и сопоставление с требованиями — в [docs/ANALYSIS.md](docs/ANALYSIS.md) и [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Требования

- .NET SDK 8
- Node.js 20+ (проверено на 24)
- SQL Server: подойдёт LocalDB (`(localdb)\MSSQLLocalDB`, ставится с Visual Studio) или любой экземпляр SQL Server 2019+
- `dotnet-ef` для работы с миграциями: `dotnet tool install -g dotnet-ef --version 8.*`

## Запуск

### 1. Backend

```powershell
cd backend/TurMax.Api
dotnet user-secrets set "Jwt:Key" "<случайная строка не короче 32 символов>"
dotnet user-secrets set "Seed:AdminEmail" "admin@turmax.local"
dotnet user-secrets set "Seed:AdminPassword" "<пароль администратора>"
dotnet user-secrets set "Seed:DemoPassword" "<пароль демо-аккаунтов>"
dotnet run --launch-profile http
```

- API: http://localhost:5199, Swagger: http://localhost:5199/swagger
- При первом запуске применяются миграции и база заполняется демонстрационными данными (`Data/Seed/seed.json`).
- Строка подключения — `ConnectionStrings:Default` в `appsettings.json`; для другого сервера её можно переопределить через user-secrets или переменную окружения `ConnectionStrings__Default`.
- Секреты в репозитории не хранятся. В продакшене задаются переменными окружения (`Jwt__Key`, `Seed__AdminPassword` …).

Демо-аккаунты (пароль — значение `Seed:DemoPassword`, посмотреть: `dotnet user-secrets list`):

| Роль | E-mail |
|---|---|
| Турист (есть завершённая поездка для проверки отзыва) | `tourist@turmax.local` |
| Операторы | `operator.trek@turmax.local`, `operator.issyk@turmax.local`, `operator.naryn@turmax.local`, `operator.south@turmax.local` |
| Администратор | значение `Seed:AdminEmail` |

Если `Seed:DemoPassword` не задан, демо-операторы создаются заблокированными, а демо-турист не создаётся.

### 2. Frontend

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Сайт: http://localhost:3000. Next.js проксирует `/api/*` и `/uploads/*` на backend (аналог nginx из схемы развёртывания, п. 2.2), поэтому refresh-cookie работает на одном домене.

Сборка для продакшена: `npm run build` и `npm start` (backend при сборке должен быть запущен — главная и карта генерируются заранее и обновляются раз в минуту).

### 3. Тесты

```powershell
cd backend
dotnet test
```

## Миграции

```powershell
cd backend/TurMax.Api
dotnet ef migrations add <Имя> -o Data/Migrations
dotnet ef database update
```

Пересоздать базу с нуля: `dotnet ef database drop -f`, затем запустить API (миграции и сид применятся автоматически).

## Настройки

| Ключ | Назначение |
|---|---|
| `Routing:OsrmBaseUrl` | Адрес OSRM для расчёта расстояний по дорогам. При недоступности используется резервная оценка «по прямой × 1,3», и смета помечается как приблизительная (п. 2.2) |
| `Smtp:*` | Почтовый сервер для уведомлений. Если `Smtp:Host` пуст, письма не отправляются (пишутся в лог), уведомления остаются в кабинете |
| `Cors:Origins` | Разрешённые источники для прямых запросов к API |
| `NEXT_PUBLIC_TILE_URL` | Сервер тайлов карты; для эксплуатации стоит заменить tile.openstreetmap.org на собственный или коммерческий (правила OSMF) |

## Контент и изображения

- Координаты и высоты мест взяты из Википедии и Викиданных.
- Фотографии — из Wikimedia Commons; в БД хранятся ссылки и метаданные (автор, лицензия, источник), подпись выводится на страницах.
- Цены, тарифы, операторы и выезды — **демонстрационные** и помечены так на сайте.
