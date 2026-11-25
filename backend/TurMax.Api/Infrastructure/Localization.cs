using System.Text.RegularExpressions;

namespace TurMax.Api.Infrastructure;

/// <summary>Языки интерфейса (FR-21): русский — исходный, кыргызский и английский — переводы.</summary>
public static class Langs
{
    public const string Ru = "ru", Ky = "ky", En = "en";
    public static readonly string[] All = [Ru, Ky, En];
    public static string Normalize(string? l)
    {
        var v = (l ?? "").Trim().ToLowerInvariant();
        if (v.Length > 2) v = v[..2];
        return v is Ky or En ? v : Ru;
    }

    /// <summary>Язык текущего запроса: ?lang=, заголовок X-Lang или Accept-Language.</summary>
    public static string Of(HttpContext? ctx)
    {
        if (ctx is null) return Ru;
        if (ctx.Items.TryGetValue("lang", out var cached) && cached is string c) return c;
        var raw = ctx.Request.Query["lang"].FirstOrDefault()
                  ?? ctx.Request.Headers["X-Lang"].FirstOrDefault()
                  ?? ctx.Request.Headers.AcceptLanguage.FirstOrDefault()?.Split(',')[0];
        var lang = Normalize(raw);
        ctx.Items["lang"] = lang;
        return lang;
    }
}

/// <summary>
/// Перевод системных сообщений (ошибки, предупреждения сметы, уведомления, история заявок).
/// Исходный текст хранится на русском; перевод выполняется при выдаче ответа на языке того, кто его читает.
/// </summary>
public static class Messages
{
    static readonly Dictionary<string, (string En, string Ky)> Fixed = new()
    {
        // Общие
        ["Объект не найден"] = ("Not found", "Табылган жок"),
        ["Ресурс не найден"] = ("Resource not found", "Ресурс табылган жок"),
        ["Недостаточно прав"] = ("Insufficient permissions", "Укук жетишсиз"),
        ["Требуется вход в систему"] = ("Please sign in", "Системага кириңиз"),
        ["Требуется вход"] = ("Please sign in", "Системага кириңиз"),
        ["Внутренняя ошибка сервера"] = ("Internal server error", "Сервердин ички катасы"),
        ["Слишком много попыток. Повторите позже"] = ("Too many attempts. Please try again later", "Аракет өтө көп. Кийинчерээк кайталаңыз"),
        ["Ошибка запроса"] = ("Request error", "Сурам катасы"),
        ["Неверное значение"] = ("Invalid value", "Туура эмес маани"),
        ["Ошибка валидации"] = ("Validation error", "Текшерүү катасы"),
        // Вход и профиль
        ["Пользователь с таким e-mail уже зарегистрирован"] = ("A user with this e-mail is already registered", "Бул e-mail менен колдонуучу катталган"),
        ["Укажите название компании"] = ("Enter the company name", "Компаниянын аталышын жазыңыз"),
        ["Неверный e-mail или пароль"] = ("Invalid e-mail or password", "E-mail же сырсөз туура эмес"),
        ["Учётная запись заблокирована"] = ("The account is blocked", "Каттоо эсеби бөгөттөлгөн"),
        ["Сессия истекла"] = ("Session expired", "Сеанстын мөөнөтү бүттү"),
        ["Текущий пароль указан неверно"] = ("The current password is incorrect", "Учурдагы сырсөз туура эмес"),
        ["Сначала отмените или завершите активные заявки"] = ("Cancel or complete your active bookings first", "Адегенде активдүү өтүнмөлөрдү жокко чыгарыңыз же аяктаңыз"),
        ["Укажите e-mail"] = ("Enter your e-mail", "E-mail жазыңыз"),
        ["Неверный формат e-mail"] = ("Invalid e-mail format", "E-mail форматы туура эмес"),
        ["Укажите пароль"] = ("Enter a password", "Сырсөз жазыңыз"),
        ["Пароль — не короче 8 символов"] = ("Password must be at least 8 characters", "Сырсөз 8 белгиден кем болбошу керек"),
        ["Укажите имя"] = ("Enter your name", "Атыңызды жазыңыз"),
        ["Имя слишком короткое"] = ("The name is too short", "Аты өтө кыска"),
        ["Неверный формат телефона"] = ("Invalid phone format", "Телефондун форматы туура эмес"),
        ["Неизвестный тип аккаунта"] = ("Unknown account type", "Каттоо эсебинин түрү белгисиз"),
        ["Необходимо согласие на обработку персональных данных"] = ("Consent to personal data processing is required", "Жеке маалыматтарды иштетүүгө макулдук керек"),
        // Маршруты и сметы
        ["Укажите название"] = ("Enter a title", "Аталышын жазыңыз"),
        ["Участников — от 1 до 50"] = ("Participants: 1 to 50", "Катышуучулар: 1ден 50гө чейин"),
        ["Не более 60 точек"] = ("No more than 60 points", "60 чекиттен ашпашы керек"),
        ["Маршрут не найден"] = ("Route not found", "Маршрут табылган жок"),
        ["Оператор не найден или не прошёл проверку"] = ("The operator was not found or is not verified", "Оператор табылган жок же текшерүүдөн өткөн эмес"),
        ["Нет доступного оператора для расчёта. Выберите оператора в настройках маршрута"] = ("No operator available for the estimate. Choose an operator in the route settings", "Эсептөө үчүн оператор жок. Маршруттун жөндөөлөрүнөн оператор тандаңыз"),
        ["Добавьте в маршрут хотя бы одну точку"] = ("Add at least one point to the route", "Маршрутка жок дегенде бир чекит кошуңуз"),
        ["Некоторые точки не найдены"] = ("Some points were not found", "Айрым чекиттер табылган жок"),
        ["По маршруту есть заявки — его нельзя удалить. Сделайте копию для изменений"] = ("This route has bookings and cannot be deleted. Make a copy to edit it", "Маршрут боюнча өтүнмөлөр бар — аны өчүрүүгө болбойт. Өзгөртүү үчүн көчүрмөсүн жасаңыз"),
        ["Формат экспорта: pdf или gpx"] = ("Export format: pdf or gpx", "Экспорт форматы: pdf же gpx"),
        ["У выбранного оператора нет тарифа на этот тип транспорта — транспорт не учтён в смете"] = ("The selected operator has no rate for this vehicle type — transport is not included", "Тандалган оператордо бул унаа түрүнө тариф жок — транспорт сметага кирген жок"),
        ["У оператора нет тарифа на питание"] = ("The operator has no meal rate", "Оператордо тамак-ашка тариф жок"),
        ["Оператор не предоставляет услуги гида"] = ("The operator does not provide a guide", "Оператор гид кызматын көрсөтпөйт"),
        ["Расстояния оценены приблизительно (по прямой × 1,3) — сервис маршрутизации недоступен"] = ("Distances are approximate (straight line × 1.3) — the routing service is unavailable", "Аралыктар болжолдуу (түз сызык × 1,3) — маршрутташтыруу кызматы жеткиликсиз"),
        // Заявки
        ["Укажите либо выезд готового тура, либо свой маршрут"] = ("Choose either a tour departure or your own route", "Даяр турдун чыгуусун же өз маршрутуңузду тандаңыз"),
        ["Тур недоступен для бронирования"] = ("The tour is not available for booking", "Турду брондоого болбойт"),
        ["Этот выезд уже начался"] = ("This departure has already started", "Бул чыгуу башталып калган"),
        ["Укажите дату начала поездки в будущем"] = ("Choose a future start date", "Сапардын башталган күнүн келечектен тандаңыз"),
        ["Заявка не найдена"] = ("Booking not found", "Өтүнмө табылган жок"),
        ["Укажите новую цену"] = ("Enter the new price", "Жаңы бааны жазыңыз"),
        ["Укажите причину отклонения"] = ("Enter the reason for rejection", "Четке кагуунун себебин жазыңыз"),
        ["Недостаточно свободных мест на этот выезд"] = ("Not enough free seats for this departure", "Бул чыгууга бош орун жетишсиз"),
        ["Отменить заявку можно только до начала тура"] = ("A booking can only be cancelled before the tour starts", "Өтүнмөнү тур башталганга чейин гана жокко чыгарууга болот"),
        ["Отзыв можно оставить только по завершённой поездке"] = ("A review can only be left for a completed trip", "Пикирди аяктаган сапар боюнча гана калтырууга болот"),
        ["Отзыв по этой заявке уже оставлен"] = ("A review for this booking has already been left", "Бул өтүнмө боюнча пикир калтырылган"),
        ["Укажите контактный телефон"] = ("Enter a contact phone", "Байланыш телефонун жазыңыз"),
        ["Неизвестное действие"] = ("Unknown action", "Белгисиз аракет"),
        ["Оценка — от 1 до 5"] = ("Rating: 1 to 5", "Баа: 1ден 5ке чейин"),
        ["Напишите отзыв"] = ("Write a review", "Пикир жазыңыз"),
        ["Отзыв — не короче 10 символов"] = ("A review must be at least 10 characters", "Пикир 10 белгиден кем болбошу керек"),
        ["Укажите тур или направление"] = ("Choose a tour or a destination", "Турду же багытты тандаңыз"),
        // История заявки и уведомления
        ["Заявка создана"] = ("Booking created", "Өтүнмө түзүлдү"),
        ["Оператор открыл заявку"] = ("The operator opened the booking", "Оператор өтүнмөнү ачты"),
        ["Турист согласился с новой ценой"] = ("The traveller accepted the new price", "Турист жаңы баага макул болду"),
        ["Отменена туристом"] = ("Cancelled by the traveller", "Турист жокко чыгарды"),
        ["Автоматическая отмена: оператор не ответил за 72 часа"] = ("Cancelled automatically: the operator did not reply within 72 hours", "Автоматтык түрдө жокко чыгарылды: оператор 72 саат ичинде жооп берген жок"),
        ["Поездка завершена"] = ("Trip completed", "Сапар аяктады"),
        ["Новая заявка"] = ("New booking", "Жаңы өтүнмө"),
        ["Заявка подтверждена"] = ("Booking confirmed", "Өтүнмө ырасталды"),
        ["Заявка отклонена"] = ("Booking rejected", "Өтүнмө четке кагылды"),
        ["Оператор изменил цену"] = ("The operator changed the price", "Оператор бааны өзгөрттү"),
        ["Цена согласована"] = ("Price agreed", "Баа макулдашылды"),
        ["Заявка отменена туристом"] = ("Booking cancelled by the traveller", "Өтүнмөнү турист жокко чыгарды"),
        ["Новый отзыв"] = ("New review", "Жаңы пикир"),
        ["Заявка отменена"] = ("Booking cancelled", "Өтүнмө жокко чыгарылды"),
        ["Как прошла поездка?"] = ("How was your trip?", "Сапарыңыз кандай өттү?"),
        ["Оператор не ответил за 72 часа, заявка отменена автоматически. Попробуйте выбрать другого оператора."] = ("The operator did not reply within 72 hours, so the booking was cancelled automatically. Try another operator.", "Оператор 72 саат ичинде жооп берген жок, өтүнмө автоматтык түрдө жокко чыгарылды. Башка операторду тандап көрүңүз."),
        ["Поездка завершена. Оставьте отзыв — он поможет другим путешественникам."] = ("Your trip is over. Leave a review — it will help other travellers.", "Сапар аяктады. Пикир калтырыңыз — ал башка саякатчыларга жардам берет."),
        ["Система"] = ("System", "Система"),
        ["Свой маршрут"] = ("Custom route", "Өз маршрут"),
        ["Заявка"] = ("Booking", "Өтүнмө"),
        // Оператор и администратор
        ["Профиль оператора не найден"] = ("Operator profile not found", "Оператордун профили табылган жок"),
        ["День точки больше длительности тура"] = ("The point's day exceeds the tour length", "Чекиттин күнү турдун узактыгынан ашат"),
        ["Добавьте в программу хотя бы одну точку"] = ("Add at least one point to the itinerary", "Программага жок дегенде бир чекит кошуңуз"),
        ["Добавьте хотя бы одну фотографию"] = ("Add at least one photo", "Жок дегенде бир сүрөт кошуңуз"),
        ["Тур уже на модерации или опубликован"] = ("The tour is already under review or published", "Тур модерацияда же жарыяланган"),
        ["Дата выезда должна быть в будущем"] = ("The departure date must be in the future", "Чыгуу күнү келечекте болушу керек"),
        ["Выезд не найден"] = ("Departure not found", "Чыгуу табылган жок"),
        ["На выезд есть заявки — удалить нельзя"] = ("This departure has bookings and cannot be deleted", "Чыгууга өтүнмөлөр бар — өчүрүүгө болбойт"),
        ["Для транспорта укажите тип машины"] = ("Choose a vehicle type for transport", "Транспорт үчүн унаанын түрүн тандаңыз"),
        ["Тариф не найден"] = ("Rate not found", "Тариф табылган жок"),
        ["Тур не найден"] = ("Tour not found", "Тур табылган жок"),
        ["Место не найдено"] = ("Place not found", "Жер табылган жок"),
        ["Статья не найдена"] = ("Article not found", "Макала табылган жок"),
        ["Направление не найдено"] = ("Destination not found", "Багыт табылган жок"),
        ["Категория не найдена"] = ("Category not found", "Категория табылган жок"),
        ["Регион не найден"] = ("Region not found", "Аймак табылган жок"),
        ["Пользователь не найден"] = ("User not found", "Колдонуучу табылган жок"),
        ["Оператор не найден"] = ("Operator not found", "Оператор табылган жок"),
        ["Отзыв не найден"] = ("Review not found", "Пикир табылган жок"),
        ["Нельзя изменить собственную роль или заблокировать себя"] = ("You cannot change your own role or block yourself", "Өз ролуңузду өзгөртүүгө же өзүңүздү бөгөттөөгө болбойт"),
        ["Регион с таким адресом уже есть"] = ("A region with this address already exists", "Мындай даректеги аймак бар"),
        ["Регион используется в турах или точках"] = ("The region is used by tours or points", "Аймак турларда же чекиттерде колдонулат"),
        ["Категория с таким адресом уже есть"] = ("A category with this address already exists", "Мындай даректеги категория бар"),
        ["Категория используется в турах"] = ("The category is used by tours", "Категория турларда колдонулат"),
        ["Адрес уже занят"] = ("This address is already taken", "Бул дарек бош эмес"),
        ["Точка используется в турах или маршрутах — снимите её с публикации вместо удаления"] = ("The point is used in tours or routes — unpublish it instead of deleting", "Чекит турларда же маршруттарда колдонулат — өчүрбөй, жарыялоодон алыңыз"),
        ["Неверный адрес сайта"] = ("Invalid website address", "Сайттын дареги туура эмес"),
        ["Наценка — от 0 до 50 %"] = ("Margin: 0 to 50 %", "Үстөк баа: 0дөн 50 %га чейин"),
        ["Языки: ru, en, ky через запятую"] = ("Languages: ru, en, ky separated by commas", "Тилдер: ru, en, ky үтүр менен"),
        ["Укажите цену"] = ("Enter a price", "Бааны жазыңыз"),
        ["Мест — от 1 до 200"] = ("Seats: 1 to 200", "Орундар: 1ден 200гө чейин"),
        ["Адрес — латиница, цифры и дефис"] = ("Address: Latin letters, digits and hyphens", "Дарек: латын тамгалары, сандар жана дефис"),
        ["Широта вне Кыргызстана"] = ("Latitude is outside Kyrgyzstan", "Кеңдик Кыргызстандын чегинен тышкары"),
        ["Долгота вне Кыргызстана"] = ("Longitude is outside Kyrgyzstan", "Узундук Кыргызстандын чегинен тышкары"),
        ["Русский — исходный язык, его правят в основной форме"] = ("Russian is the source language — edit it in the main form", "Орус тили — негизги тил, аны негизги формада оңдоңуз"),
        // Загрузка файлов
        ["Файл не выбран"] = ("No file selected", "Файл тандалган жок"),
        ["Размер файла — не более 8 МБ"] = ("File size: up to 8 MB", "Файлдын көлөмү 8 МБдан ашпашы керек"),
        ["Допустимые форматы: JPG, PNG, WebP"] = ("Allowed formats: JPG, PNG, WebP", "Уруксат берилген форматтар: JPG, PNG, WebP"),
        ["Содержимое файла не соответствует формату изображения"] = ("The file content does not match an image format", "Файлдын мазмуну сүрөт форматына туура келбейт"),
    };

    /// <summary>Сообщения с подстановками: шаблон на русском → английский и кыргызский варианты ($1, $2 — подстановки).</summary>
    static readonly (Regex Ru, string En, string Ky)[] Patterns =
    [
        (new(@"^Недостаточно свободных мест: осталось (\d+)$"), "Not enough seats: $1 left", "Бош орун жетишсиз: $1 калды"),
        (new(@"^Недопустимый переход статуса: (.+) → (.+)$"), "Status change not allowed: $1 → $2", "Статустун мындай өзгөрүшүнө жол берилбейт: $1 → $2"),
        (new(@"^Нет цены ночлега в точке «(.+)»$"), "No lodging price at «$1»", "«$1» чекитинде түнөөнүн баасы жок"),
        (new(@"^День (\d+): более 8 часов в пути \((.+) ч\) — рекомендуем добавить ночёвку$"), "Day $1: more than 8 hours on the road ($2 h) — consider adding an overnight stay", "$1-күн: жолдо 8 сааттан ашык ($2 саат) — түнөп калууну кошууну сунуштайбыз"),
        (new(@"^Для посещения «(.+)» нужен пропуск в пограничную зону$"), "A border zone permit is required to visit «$1»", "«$1» баруу үчүн чек ара тилкесине уруксат керек"),
        (new(@"^Поступила заявка от (.+) на (\S+), участников: (\d+)\.$"), "New booking from $1 for $2, participants: $3.", "$1 тарабынан $2 күнүнө өтүнмө келди, катышуучулар: $3."),
        (new(@"^Оператор (.+) подтвердил вашу заявку\. Итоговая цена: (.+) сом\.$"), "Operator $1 confirmed your booking. Final price: $2 som.", "$1 оператору өтүнмөңүздү ырастады. Акыркы баасы: $2 сом."),
        (new(@"^Оператор (.+) отклонил заявку\. Причина: (.*)$"), "Operator $1 rejected the booking. Reason: $2", "$1 оператору өтүнмөнү четке какты. Себеби: $2"),
        (new(@"^Новая цена по заявке: (.+) сом\. Подтвердите её в личном кабинете\.$"), "New booking price: $1 som. Please confirm it in your account.", "Өтүнмөнүн жаңы баасы: $1 сом. Аны жеке кабинетте ырастаңыз."),
        (new(@"^Новая цена: (.+) сом\.(.*)$"), "New price: $1 som.$2", "Жаңы баа: $1 сом.$2"),
        (new(@"^Турист (.+) согласился с новой ценой\. Заявка подтверждена\.$"), "Traveller $1 accepted the new price. The booking is confirmed.", "$1 турист жаңы баага макул болду. Өтүнмө ырасталды."),
        (new(@"^(.+) отменил заявку на (\S+)\.$"), "$1 cancelled the booking for $2.", "$1 $2 күнүнө өтүнмөнү жокко чыгарды."),
        (new(@"^(.+) оценил поездку на (\d) из 5\.$"), "$1 rated the trip $2 out of 5.", "$1 сапарды 5тен $2 деп баалады."),
    ];

    public static string T(string? ru, string lang)
    {
        if (string.IsNullOrEmpty(ru) || lang == Langs.Ru) return ru ?? "";
        if (Fixed.TryGetValue(ru, out var f)) return lang == Langs.En ? f.En : f.Ky;
        foreach (var (re, en, ky) in Patterns)
            if (re.IsMatch(ru)) return re.Replace(ru, lang == Langs.En ? en : ky);
        return ru;
    }
}
