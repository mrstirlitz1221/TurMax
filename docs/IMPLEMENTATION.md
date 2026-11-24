# TurMax — реализация и соответствие дипломной работе

## Архитектура

Модульный монолит (п. 2.1): один процесс ASP.NET Core с явным разделением ответственности.

```
backend/TurMax.Api
├── Controllers/   Auth, Catalog, Tours, Routes, Bookings (+Favorites, Notifications), Operator, Admin, Uploads
├── Services/      PricingService, RoutingService (IRoutingProvider: OSRM / Haversine), RouteService,
│                  BookingService (+BookingStateMachine, BookingScheduler), ExportService (PDF/GPX),
│                  NotificationService (+EmailSenderWorker), AuditService, Projections
├── Entities/      21 сущность предметной области
├── Dtos/          объекты передачи данных с валидацией (DataAnnotations)
├── Data/          AppDbContext, миграции, DbSeeder, Seed/seed.json, Seed/photos.json
└── Infrastructure/ JWT, единый формат ошибок, slug
frontend/src
├── app/           страницы App Router (публичные — SSR, кабинеты — клиентские)
├── components/    дизайн-система (ui, cards, PageHero, Gallery), карта, конструктор, кабинеты, админка
└── lib/           API-клиенты (server/client), типы, форматирование, загрузчик изображений
```

Слой репозиториев намеренно не выделен: `DbContext` EF Core уже является репозиторием и единицей работы.
Правило диплома «модуль не обращается к чужим таблицам» соблюдается через сервисы: `BookingService` получает смету только у `RouteService`/`PricingService`.

## Соответствие функциональным требованиям (табл. 1.4)

| Код | Где реализовано | Статус |
|---|---|---|
| FR-01 Каталог с фильтрами | `GET /api/tours` (region, category, daysMin/Max, difficulty, month, priceMax, lang, destination, sort, page); `/tours` с фильтрами в URL | ✔ |
| FR-02 Страница маршрута | `GET /api/tours/{slug}`; `/tours/[slug]`: описание, программа по дням, карта, галерея, выезды, отзывы, оператор | ✔ |
| FR-03 Поиск и поиск по карте | `GET /api/search`, `GET /api/poi?bbox=`, `/search`, `/map` | ✔ (поиск LIKE; полнотекстовый индекс в LocalDB недоступен) |
| FR-04 Регистрация и вход | `/api/auth/register|login|refresh|logout`, JWT 15 мин + refresh-cookie 30 дней с ротацией | ✔ (вход через сторонние сервисы — нет, в дипломе «по желанию») |
| FR-05 Конструктор маршрута | `/api/routes`, `PUT /api/routes/{id}/points`; `/planner/[id]`: точки с карты и поиском, дни, перетаскивание | ✔ |
| FR-06 Расчёт стоимости | `PricingService.Calculate` — формулы 2.1–2.2, табл. 2.6; тест `Diploma_control_example_matches_table_2_7` (76 374 / 19 094 сом) | ✔ |
| FR-07 Сохранение, копирование, избранное | `POST /api/routes/{id}/copy`, `/api/favorites` | ✔ |
| FR-08 Заявка и статус | `POST /api/bookings`, `/account/bookings/[id]` с историей статусов | ✔ |
| FR-09 Онлайн-оплата | — | ✘ второй этап (как в п. 2.2 диплома) |
| FR-10 Экспорт PDF и GPX | `GET /api/routes/{id}/export?format=pdf|gpx` (QuestPDF, GPX 1.1) | ✔ |
| FR-11 Отзывы | `POST /api/bookings/{id}/review` только по завершённой заявке, уникальный индекс `Reviews(BookingId)` | ✔ |
| FR-12 Уведомления | уведомления в кабинете + e-mail через SMTP в фоновой очереди | ◐ Telegram не реализован |
| FR-13 Кабинет оператора | `/operator`, `/operator/profile` | ✔ |
| FR-14 Туры, точки, цены, расписания, места | `/api/operator/tours`, `/departures`, `/services`; `/operator/tours/[id]` | ✔ |
| FR-15 Обработка заявок | `PATCH /api/operator/bookings/{id}` (confirm / reject / changePrice) | ✔ |
| FR-16 Статистика | `GET /api/operator/stats`: просмотры, заявки, конверсия, выручка | ✔ |
| FR-17 Пользователи и роли | `/api/admin/users` | ✔ |
| FR-18 Модерация | `/api/admin/operators|tours|reviews` | ✔ |
| FR-19 Справочники | `/api/admin/regions|categories|destinations|poi|articles` | ✔ |
| FR-20 Журнал действий | таблица `AuditLogs`, `/admin/audit`, неудачные входы фиксируются | ✔ |
| FR-21 Мультиязычность | — | ✘ интерфейс на русском |
| FR-22 Адаптивность | все страницы от 360 px; на смартфоне карта и маршрут переключаются вкладками (п. 2.8) | ✔ |

## Ключевые проектные решения диплома и их реализация

| Раздел диплома | Реализация |
|---|---|
| 2.2 OSRM + резервная оценка × 1,3, пометка «приблизительно» | `OsrmRoutingProvider` / `HaversineRoutingProvider` (шаблон «Стратегия»), флаг `approximate` и предупреждение в смете |
| 2.2 Адрес сервера тайлов вынесен в настройки | `NEXT_PUBLIC_TILE_URL` |
| 2.3 CHECK «либо выезд, либо маршрут» | `CK_Bookings_Target`, плюс `CK_Bookings_Participants` (1…50), `CK_Departures_Seats`, `CK_Reviews_Rating` |
| 2.3 Индексы `tours(region_id,status)`, `bookings(operator_id,status)`, уникальные `users(email)`, `reviews(booking_id)` | заданы в `AppDbContext` |
| 2.4 Композиция UserRoute–RoutePoint, агрегация Operator–Tour | каскадное удаление точек; тур оператора при блокировке скрывается из каталога, но не удаляется |
| 2.5 Единый формат ошибок `statusCode/error/message`, коды 400/401/403/404/409 | `ErrorHandling`, `AppExceptionFilter` |
| 2.6 Коэффициент дороги 1,0 / 1,3 / 1,6, скорости 70 / 40 / 25 км/ч, сезон 0,9 / 1,0 / 1,1, предупреждение > 8 ч | `RoutingService`, `PricingService` |
| 2.7 Сервер пересчитывает смету при заявке | `BookingService.CreateAsync` |
| 2.7 Переходы по диаграмме состояний, иначе 409 | `BookingStateMachine` + тесты |
| 2.7 Защита от двойной продажи места | атомарный `UPDATE … SET SeatsAvailable = SeatsAvailable - n WHERE SeatsAvailable >= n` в транзакции |
| 2.7 Автоотмена через 72 ч, автозавершение после даты окончания | `BookingScheduler` (каждые 10 минут) |
| 2.9 Проверка роли + владения объектом | `[Authorize(Roles)]` + проверки в сервисах (чужой объект → 404) |
| 2.9 OWASP: rate limit входа, заголовки безопасности, UUID, секреты вне кода, журнал | `RateLimiter "auth"`, middleware заголовков, `Guid` ключи, User Secrets, `AuditService` |
| 2.9 Согласие на обработку ПД и удаление аккаунта с обезличиванием | поле `Consent` при регистрации, `DELETE /api/auth/me` |

## Отличия от текста диплома (нужно отразить в главах 1–2)

1. Стек: ASP.NET Core 8 + EF Core 8 + SQL Server вместо NestJS + TypeORM + PostgreSQL/PostGIS; Next.js вместо «чистого» React SPA.
2. Геоданные: координаты `decimal(9,6)` + формула гаверсинуса вместо `geography` и `ST_DWithin`; «точки в радиусе» — отбор по прямоугольнику в SQL и точная фильтрация в сервисе.
3. Хеширование паролей: PBKDF2 (ASP.NET Core Identity `PasswordHasher`) вместо Argon2id.
4. Полнотекстовый GIN-индекс заменён поиском `LIKE`: LocalDB не поддерживает Full-Text Search.
5. Сущности портала, которых нет в табл. 2.3: `Destinations`, `Categories`, `Articles`, `Photos`, `Notifications`, `AuditLogs`, `RefreshTokens`.
6. Коэффициент дороги отрезка определяется по типу дороги к точке назначения (атрибут `Poi.RoadType`), а не по тегам OSM в профиле OSRM.
7. Развёртывание через Docker и nginx не подготовлено: проект запускается локально (см. README).

## Проверено

- `dotnet test`: 18 тестов, все проходят (в том числе контрольный пример табл. 2.7).
- Сквозной сценарий через API для трёх ролей: вход, маршрут, смета, PDF/GPX, копирование, заявки на тур и маршрут, отказ при нехватке мест (409), подтверждение с уменьшением мест, отмена с возвратом мест, отзыв только по завершённой заявке, запрет повторного отзыва, доступ к чужой заявке (404), запрет кабинетов чужим ролям (403), регистрация оператора в статусе «на проверке», журнал.
- `npm run lint` — без ошибок, `next build` — без ошибок.
- В браузере: главная, страница тура, вход, конструктор (добавление точки, пересчёт сметы), мобильная вёрстка без горизонтальной прокрутки.
