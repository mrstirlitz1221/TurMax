using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Entities;

namespace TurMax.Api.Data;

/// <summary>
/// Начальное наполнение базы демонстрационным контентом из Data/Seed/seed.json.
/// Координаты и высоты взяты из Википедии/Викиданных, фотографии — из Wikimedia Commons с указанием авторов и лицензий.
/// Цены и тарифы — демонстрационные.
/// </summary>
public class DbSeeder(AppDbContext db, IPasswordHasher<User> hasher, IConfiguration config, IWebHostEnvironment env, ILogger<DbSeeder> log)
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await EnsureAdminAsync(ct);
        if (!await db.Regions.AnyAsync(ct)) await SeedContentAsync(ct);
        await SeedTranslationsAsync(ct);
    }

    /// <summary>
    /// Переводы демонстрационного контента на кыргызский и английский (Data/Seed/translations.*.json).
    /// Добавляются только отсутствующие записи; дальше переводы ведёт администратор.
    /// </summary>
    async Task SeedTranslationsAsync(CancellationToken ct)
    {
        // Добавляются только отсутствующие переводы — правки администратора не перезаписываются.
        var existing = (await db.Translations.Select(t => new { t.EntityType, t.EntityId, t.Field, t.Lang }).ToListAsync(ct))
            .Select(t => (t.EntityType, t.EntityId, t.Field, t.Lang)).ToHashSet();
        var dir = Path.Combine(env.ContentRootPath, "Data", "Seed");
        var ids = new Dictionary<string, Dictionary<string, string>>
        {
            ["Destination"] = await db.Destinations.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString("D"), ct),
            ["Poi"] = await db.Pois.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString("D"), ct),
            ["Tour"] = await db.Tours.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString("D"), ct),
            ["Article"] = await db.Articles.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString("D"), ct),
            ["Category"] = await db.Categories.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString(), ct),
            ["Region"] = await db.Regions.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString(), ct),
            ["Operator"] = await db.Operators.ToDictionaryAsync(x => x.Slug, x => x.Id.ToString("D"), ct),
            // Заметки к точкам программы: «адрес-тура:номер-точки» → «id-тура:номер-точки»
            ["TourPoint"] = (await db.TourPoints.Select(p => new { p.Tour.Slug, p.TourId, p.Order }).ToListAsync(ct))
                .ToDictionary(p => $"{p.Slug}:{p.Order}", p => $"{p.TourId:D}:{p.Order}"),
        };
        var count = 0;
        foreach (var lang in new[] { "en", "ky" })
        {
            var file = Path.Combine(dir, $"translations.{lang}.json");
            if (!File.Exists(file)) continue;
            // тип сущности → адрес (slug) → поле → значение
            var data = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, Dictionary<string, JsonElement>>>>(await File.ReadAllTextAsync(file, ct), Json)!;
            foreach (var (type, bySlug) in data)
                foreach (var (slug, fields) in bySlug)
                {
                    if (!ids.TryGetValue(type, out var map) || !map.TryGetValue(slug, out var id)) { log.LogWarning("Перевод без сущности: {Type}/{Slug}", type, slug); continue; }
                    foreach (var (field, value) in fields)
                    {
                        var text = value.ValueKind == JsonValueKind.Array ? string.Join('\n', value.EnumerateArray().Select(v => v.GetString())) : value.GetString() ?? "";
                        if (text.Length == 0 || existing.Contains((type, id, field, lang))) continue;
                        db.Translations.Add(new Translation { EntityType = type, EntityId = id, Field = field, Lang = lang, Value = text });
                        count++;
                    }
                }
        }
        await db.SaveChangesAsync(ct);
        if (count > 0) log.LogInformation("Загружено переводов контента: {Count}", count);
    }

    async Task SeedContentAsync(CancellationToken ct)
    {

        var dir = Path.Combine(env.ContentRootPath, "Data", "Seed");
        var seed = JsonSerializer.Deserialize<SeedFile>(await File.ReadAllTextAsync(Path.Combine(dir, "seed.json"), ct), Json)!;
        var photos = JsonSerializer.Deserialize<Dictionary<string, List<SeedPhoto>>>(await File.ReadAllTextAsync(Path.Combine(dir, "photos.json"), ct), Json)!;

        List<Photo> Photos(IEnumerable<string>? refs, string alt)
        {
            var list = new List<Photo>();
            foreach (var r in refs ?? [])
            {
                var (key, idx) = r.Contains('#') ? (r[..r.LastIndexOf('#')], int.Parse(r[(r.LastIndexOf('#') + 1)..])) : (r, 0);
                if (!photos.TryGetValue(key, out var set) || idx >= set.Count) { log.LogWarning("Фото не найдено: {Ref}", r); continue; }
                var p = set[idx];
                var url = p.Url.Split('?')[0];
                list.Add(new Photo { Url = url, Alt = alt, Author = p.Author, License = p.License, SourceUrl = p.Source, SortOrder = list.Count });
            }
            return list;
        }

        var regions = seed.Regions.Select(r => new Region { Name = r.Name, Slug = r.Slug, Center = r.Center }).ToList();
        db.Regions.AddRange(regions);
        var categories = seed.Categories.Select((c, i) =>
        {
            var ph = Photos([c.Photo], c.Name).FirstOrDefault();
            return new Category { Name = c.Name, Slug = c.Slug, Tagline = c.Tagline, Description = c.Description, SortOrder = i, ImageUrl = ph?.Url, ImageCredit = Credit(ph) };
        }).ToList();
        db.Categories.AddRange(categories);
        await db.SaveChangesAsync(ct);
        var region = regions.ToDictionary(r => r.Slug);
        var category = categories.ToDictionary(c => c.Slug);

        var destinations = new Dictionary<string, Destination>();
        foreach (var d in seed.Destinations)
        {
            var e = new Destination
            {
                Slug = d.Slug, Name = d.Name, Tagline = d.Tagline, Summary = d.Summary, Description = d.Description,
                Region = region[d.Region], Latitude = d.Lat, Longitude = d.Lng, BestTime = d.BestTime,
                Highlights = string.Join('\n', d.Highlights), IsFeatured = d.Featured, SortOrder = d.Sort,
                Categories = d.Categories.Select(c => category[c]).ToList(), Photos = Photos(d.Photos, d.Name)
            };
            destinations[d.Slug] = e;
            db.Destinations.Add(e);
        }

        var pois = new Dictionary<string, Poi>();
        foreach (var p in seed.Pois)
        {
            var e = new Poi
            {
                Slug = p.Slug, Name = p.Name, Kind = p.Kind, Summary = p.Summary, Description = p.Description,
                Region = region[p.Region], Destination = p.Destination is null ? null : destinations[p.Destination],
                Latitude = p.Lat, Longitude = p.Lng, AltitudeM = p.Alt, RoadType = p.Road, EntryFee = p.Fee, LodgingPrice = p.Lodging,
                NeedsPermit = p.Permit, Season = p.Season, Photos = Photos(p.Photos, p.Name)
            };
            pois[p.Slug] = e;
            db.Pois.Add(e);
        }

        var demoPassword = config["Seed:DemoPassword"];
        var operators = new Dictionary<string, Operator>();
        foreach (var o in seed.Operators)
        {
            var user = new User
            {
                Email = $"{o.User}@turmax.local", FullName = o.Name, Role = UserRole.Operator, ConsentAt = DateTime.UtcNow,
                IsBlocked = string.IsNullOrEmpty(demoPassword)
            };
            user.PasswordHash = hasher.HashPassword(user, demoPassword ?? RandomSecret());
            var e = new Operator
            {
                User = user, Name = o.Name, Slug = o.Slug, Kind = o.Kind, Description = o.Description, Margin = o.Margin,
                Verification = VerificationStatus.Verified, IsDemo = true, Email = user.Email,
                Services = o.Services.Select(s => new Service { Type = s.Type, VehicleType = s.Vehicle, Name = s.Name, Price = s.Price }).ToList()
            };
            operators[o.Key] = e;
            db.Operators.Add(e);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rnd = new Random(42);
        var tours = new List<Tour>();
        foreach (var t in seed.Tours)
        {
            var tour = new Tour
            {
                Slug = t.Slug, Operator = operators[t.Operator], Region = region[t.Region], Category = category[t.Category],
                Title = t.Title, Summary = t.Summary, Description = t.Description, Days = t.Days, Difficulty = t.Difficulty,
                SeasonFromMonth = t.SeasonFrom, SeasonToMonth = t.SeasonTo, MaxAltitudeM = t.MaxAlt, DistanceKm = t.Distance,
                PriceFrom = t.PriceFrom, GuideLanguages = t.Langs, Recommendations = string.Join('\n', t.Recommendations),
                Includes = string.Join('\n', t.Includes), NeedsPermit = t.Permit, Status = TourStatus.Published,
                Views = rnd.Next(40, 400), Photos = Photos(t.Photos, t.Title)
            };
            var order = 0;
            foreach (var p in t.Points) tour.Points.Add(new TourPoint { Poi = pois[p.Poi], Day = p.Day, Order = ++order, Note = p.Note });
            foreach (var date in NextDepartures(today, t.SeasonFrom, t.SeasonTo, 5))
                tour.Departures.Add(new Departure { StartDate = date, Price = t.PriceFrom, SeatsTotal = t.Seats, SeatsAvailable = t.Seats });
            tours.Add(tour);
            db.Tours.Add(tour);
        }

        foreach (var a in seed.Articles)
        {
            db.Articles.Add(new Article
            {
                Slug = a.Slug, Title = a.Title, Lead = a.Lead, Body = a.Body, Topic = a.Topic, ReadingMinutes = a.Minutes,
                PublishedAt = DateTime.UtcNow.AddDays(-a.DaysAgo), Destination = a.Destination is null ? null : destinations[a.Destination],
                Photos = Photos(a.Photos, a.Title)
            });
        }

        // Демонстрационный турист с одной завершённой поездкой — чтобы можно было проверить сценарий отзыва.
        if (!string.IsNullOrEmpty(demoPassword))
        {
            var tourist = new User { Email = "tourist@turmax.local", FullName = "Демо Турист", Phone = "+996 555 000 000", ConsentAt = DateTime.UtcNow };
            tourist.PasswordHash = hasher.HashPassword(tourist, demoPassword);
            db.Users.Add(tourist);
            var past = tours.First(t => t.Slug == "burana-za-odin-den");
            var dep = new Departure { Tour = past, StartDate = today.AddDays(-20), Price = past.PriceFrom, SeatsTotal = 7, SeatsAvailable = 5 };
            db.Departures.Add(dep);
            var b = new Booking
            {
                User = tourist, Operator = past.Operator, Departure = dep, Participants = 2, StartDate = dep.StartDate, EndDate = dep.StartDate,
                PriceCalc = dep.Price * 2, PriceFinal = dep.Price * 2, Status = BookingStatus.Completed, ContactPhone = tourist.Phone!,
                SeatsReserved = true, CreatedAt = DateTime.UtcNow.AddDays(-30)
            };
            b.History.AddRange([
                new BookingHistory { ToStatus = BookingStatus.New, ChangedBy = tourist, Note = "Заявка создана", CreatedAt = DateTime.UtcNow.AddDays(-30) },
                new BookingHistory { FromStatus = BookingStatus.New, ToStatus = BookingStatus.InReview, ChangedBy = past.Operator.User, CreatedAt = DateTime.UtcNow.AddDays(-29) },
                new BookingHistory { FromStatus = BookingStatus.InReview, ToStatus = BookingStatus.Confirmed, ChangedBy = past.Operator.User, CreatedAt = DateTime.UtcNow.AddDays(-29) },
                new BookingHistory { FromStatus = BookingStatus.Confirmed, ToStatus = BookingStatus.Completed, Note = "Поездка завершена", CreatedAt = DateTime.UtcNow.AddDays(-19) }
            ]);
            db.Bookings.Add(b);
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("База заполнена демонстрационными данными: {D} направлений, {P} точек, {T} туров", destinations.Count, pois.Count, tours.Count);
    }

    async Task EnsureAdminAsync(CancellationToken ct)
    {
        var email = config["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = config["Seed:AdminPassword"];
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password)) return;
        if (await db.Users.AnyAsync(u => u.Email == email, ct)) return;
        var admin = new User { Email = email, FullName = "Администратор TurMax", Role = UserRole.Admin, ConsentAt = DateTime.UtcNow };
        admin.PasswordHash = hasher.HashPassword(admin, password);
        db.Users.Add(admin);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Создан администратор {Email}", email);
    }

    /// <summary>Ближайшие даты выездов в сезон тура: каждые две недели по субботам.</summary>
    static IEnumerable<DateOnly> NextDepartures(DateOnly from, int seasonFrom, int seasonTo, int count)
    {
        bool InSeason(int m) => seasonFrom <= seasonTo ? m >= seasonFrom && m <= seasonTo : m >= seasonFrom || m <= seasonTo;
        var d = from.AddDays(7);
        while (d.DayOfWeek != DayOfWeek.Saturday) d = d.AddDays(1);
        var found = 0;
        for (var guard = 0; guard < 120 && found < count; guard++, d = d.AddDays(14))
            if (InSeason(d.Month)) { found++; yield return d; }
    }

    static string RandomSecret() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(24));

    static string? Credit(Photo? p) => p is null ? null : string.Join(" · ", new[] { p.Author, p.License }.Where(s => !string.IsNullOrEmpty(s)));

    // ---------- Формат seed.json ----------
    record SeedPhoto(string Url, string? Author, string? License, string? Source);
    record SeedFile(List<SeedRegion> Regions, List<SeedCategory> Categories, List<SeedDestination> Destinations, List<SeedPoi> Pois,
        List<SeedOperator> Operators, List<SeedTour> Tours, List<SeedArticle> Articles);
    record SeedRegion(string Name, string Slug, string? Center);
    record SeedCategory(string Slug, string Name, string Tagline, string Description, string Photo);
    record SeedDestination(string Slug, string Name, string Region, decimal Lat, decimal Lng, bool Featured, int Sort, string Tagline, string Summary,
        string Description, string? BestTime, List<string> Highlights, List<string> Categories, List<string> Photos);
    record SeedPoi(string Slug, string Name, PoiKind Kind, string Region, string? Destination, decimal Lat, decimal Lng, int? Alt, RoadType Road,
        decimal? Fee, decimal? Lodging, bool Permit, string? Season, string Summary, string Description, List<string> Photos);
    record SeedService(ServiceType Type, VehicleType? Vehicle, string Name, decimal Price);
    record SeedOperator(string Key, string Name, string Slug, OperatorKind Kind, decimal Margin, string User, string Description, List<SeedService> Services);
    record SeedPoint(string Poi, int Day, string? Note);
    record SeedTour(string Slug, string Operator, string Region, string Category, int Days, Difficulty Difficulty, int SeasonFrom, int SeasonTo,
        string Title, decimal PriceFrom, decimal? Distance, int? MaxAlt, string Langs, int Seats, bool Permit, string Summary, string Description,
        List<string> Recommendations, List<string> Includes, List<SeedPoint> Points, List<string> Photos);
    record SeedArticle(string Slug, string Topic, int Minutes, int DaysAgo, string? Destination, string Title, string Lead, List<string> Photos, string Body);
}
