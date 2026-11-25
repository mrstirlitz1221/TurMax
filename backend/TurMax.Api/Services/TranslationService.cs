using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Infrastructure;

namespace TurMax.Api.Services;

/// <summary>
/// Перевод контента на язык запроса (FR-21). Русский текст хранится в основных таблицах, переводы — в справочнике
/// Translations (тип сущности, идентификатор, поле, язык). Если перевода нет, остаётся русский текст.
/// Названия регионов и категорий внутри карточек переводятся по словарю «русское название → перевод».
/// </summary>
public class TranslationService(AppDbContext db, IHttpContextAccessor http)
{
    public const string Destination = "Destination", Poi = "Poi", Tour = "Tour", Article = "Article", Category = "Category", Region = "Region",
        Operator = "Operator", TourPoint = "TourPoint";

    public static readonly Dictionary<string, string[]> Fields = new()
    {
        [Destination] = ["Name", "Tagline", "Summary", "Description", "BestTime", "Highlights"],
        [Poi] = ["Name", "Summary", "Description", "Season"],
        [Tour] = ["Title", "Summary", "Description", "Recommendations", "Includes"],
        [Article] = ["Title", "Lead", "Body", "Topic", "AuthorName"],
        [Category] = ["Name", "Tagline", "Description"],
        [Region] = ["Name", "Center"],
        [Operator] = ["Name", "Description"],
        [TourPoint] = ["Note"],
    };

    public string Lang => Langs.Of(http.HttpContext);
    bool Skip => Lang == Langs.Ru;

    Dictionary<string, Dictionary<(string, string), string>>? _cache;
    readonly Dictionary<string, HashSet<string>> _loaded = new();
    Dictionary<string, string>? _regionNames, _categoryNames, _operatorNames;

    /// <summary>Загружает переводы сущностей одного типа: (id, поле) → значение.</summary>
    async Task<Dictionary<(string, string), string>> Load(string type, IEnumerable<string> ids, CancellationToken ct)
    {
        _cache ??= new();
        var list = ids.Distinct().ToList();
        if (!_cache.TryGetValue(type, out var map)) _cache[type] = map = new();
        if (!_loaded.TryGetValue(type, out var done)) _loaded[type] = done = new();
        var missing = list.Where(id => done.Add(id)).ToList();
        if (missing.Count > 0)
        {
            var rows = await db.Translations.AsNoTracking()
                .Where(t => t.EntityType == type && t.Lang == Lang && missing.Contains(t.EntityId))
                .Select(t => new { t.EntityId, t.Field, t.Value }).ToListAsync(ct);
            foreach (var r in rows) map[(r.EntityId, r.Field)] = r.Value;
        }
        return map;
    }

    static string Key(Guid id) => id.ToString("D");
    static string Pick(Dictionary<(string, string), string> m, string id, string field, string fallback) =>
        m.TryGetValue((id, field), out var v) && !string.IsNullOrWhiteSpace(v) ? v : fallback;

    async Task<(Dictionary<string, string> regions, Dictionary<string, string> categories)> NameMaps(CancellationToken ct)
    {
        if (_regionNames is null)
        {
            var regions = await db.Regions.AsNoTracking().Select(r => new { r.Id, r.Name }).ToListAsync(ct);
            var rt = await Load(Region, regions.Select(r => r.Id.ToString()), ct);
            _regionNames = regions.ToDictionary(r => r.Name, r => Pick(rt, r.Id.ToString(), "Name", r.Name));
            var cats = await db.Categories.AsNoTracking().Select(c => new { c.Id, c.Name }).ToListAsync(ct);
            var crt = await Load(Category, cats.Select(c => c.Id.ToString()), ct);
            _categoryNames = cats.ToDictionary(c => c.Name, c => Pick(crt, c.Id.ToString(), "Name", c.Name));
        }
        return (_regionNames, _categoryNames!);
    }

    /// <summary>Названия операторов (в карточках туров) — по словарю «русское название → перевод».</summary>
    async Task<Dictionary<string, string>> OperatorNames(CancellationToken ct)
    {
        if (_operatorNames is null)
        {
            var ops = await db.Operators.AsNoTracking().Select(o => new { o.Id, o.Name }).ToListAsync(ct);
            var t = await Load(Operator, ops.Select(o => Key(o.Id)), ct);
            _operatorNames = ops.GroupBy(o => o.Name).ToDictionary(g => g.Key, g => Pick(t, Key(g.First().Id), "Name", g.Key));
        }
        return _operatorNames;
    }

    /// <summary>Подпись к фото (alt) — на языке страницы.</summary>
    static PhotoDto? Alt(PhotoDto? p, string alt) => p is null ? null : p with { Alt = alt };
    static List<PhotoDto> Alt(IEnumerable<PhotoDto> ps, string alt) => ps.Select(p => p with { Alt = alt }).ToList();

    static string Map(Dictionary<string, string> m, string name) => m.TryGetValue(name, out var v) ? v : name;

    // ---------- Карточки ----------

    public async Task<List<DestinationCardDto>> Apply(IEnumerable<DestinationCardDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var (rm, cm) = await NameMaps(ct);
        var t = await Load(Destination, list.Select(x => Key(x.Id)), ct);
        return list.Select(x => x with
        {
            Name = Pick(t, Key(x.Id), "Name", x.Name), Tagline = Pick(t, Key(x.Id), "Tagline", x.Tagline),
            Summary = Pick(t, Key(x.Id), "Summary", x.Summary), Region = Map(rm, x.Region),
            Categories = x.Categories.Select(c => Map(cm, c)).ToList(), Cover = Alt(x.Cover, Pick(t, Key(x.Id), "Name", x.Name))
        }).ToList();
    }

    public async Task<List<PoiCardDto>> Apply(IEnumerable<PoiCardDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var (rm, _) = await NameMaps(ct);
        var t = await Load(Poi, list.Select(x => Key(x.Id)), ct);
        return list.Select(x => x with { Name = Pick(t, Key(x.Id), "Name", x.Name), Summary = Pick(t, Key(x.Id), "Summary", x.Summary), Region = Map(rm, x.Region), Cover = Alt(x.Cover, Pick(t, Key(x.Id), "Name", x.Name)) }).ToList();
    }

    public async Task<List<TourCardDto>> Apply(IEnumerable<TourCardDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var (rm, cm) = await NameMaps(ct);
        var om = await OperatorNames(ct);
        var t = await Load(Tour, list.Select(x => Key(x.Id)), ct);
        return list.Select(x => x with
        {
            Title = Pick(t, Key(x.Id), "Title", x.Title), Summary = Pick(t, Key(x.Id), "Summary", x.Summary),
            Region = Map(rm, x.Region), Category = Map(cm, x.Category), OperatorName = Map(om, x.OperatorName),
            Cover = Alt(x.Cover, Pick(t, Key(x.Id), "Title", x.Title))
        }).ToList();
    }

    public async Task<List<ArticleCardDto>> Apply(IEnumerable<ArticleCardDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var t = await Load(Article, list.Select(x => Key(x.Id)), ct);
        return list.Select(x => x with { Title = Pick(t, Key(x.Id), "Title", x.Title), Lead = Pick(t, Key(x.Id), "Lead", x.Lead), Topic = Pick(t, Key(x.Id), "Topic", x.Topic), Cover = Alt(x.Cover, Pick(t, Key(x.Id), "Title", x.Title)) }).ToList();
    }

    public async Task<List<CategoryDto>> Apply(IEnumerable<CategoryDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var t = await Load(Category, list.Select(x => x.Id.ToString()), ct);
        return list.Select(x => x with
        {
            Name = Pick(t, x.Id.ToString(), "Name", x.Name), Tagline = Pick(t, x.Id.ToString(), "Tagline", x.Tagline),
            Description = Pick(t, x.Id.ToString(), "Description", x.Description)
        }).ToList();
    }

    public async Task<List<RegionDto>> Apply(IEnumerable<RegionDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var t = await Load(Region, list.Select(x => x.Id.ToString()), ct);
        return list.Select(x => x with { Name = Pick(t, x.Id.ToString(), "Name", x.Name), Center = x.Center is null ? null : Pick(t, x.Id.ToString(), "Center", x.Center) }).ToList();
    }

    public async Task<List<MapPointDto>> Apply(IEnumerable<MapPointDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var d = await Load(Destination, list.Where(x => x.Type == "destination").Select(x => Key(x.Id)), ct);
        var p = await Load(Poi, list.Where(x => x.Type == "poi").Select(x => Key(x.Id)), ct);
        return list.Select(x =>
        {
            var m = x.Type == "destination" ? d : p;
            return x with { Name = Pick(m, Key(x.Id), "Name", x.Name), Summary = Pick(m, Key(x.Id), x.Type == "destination" ? "Tagline" : "Summary", x.Summary) };
        }).ToList();
    }

    /// <summary>Заявки: название тура и оператора на языке читателя.</summary>
    public async Task<List<BookingDto>> Apply(IEnumerable<BookingDto> items, CancellationToken ct)
    {
        var list = items.ToList();
        if (Skip || list.Count == 0) return list;
        var slugs = list.Where(b => b.TourSlug != null).Select(b => b.TourSlug!).Distinct().ToList();
        var tours = await db.Tours.AsNoTracking().Where(t => slugs.Contains(t.Slug)).Select(t => new { t.Slug, t.Id }).ToListAsync(ct);
        var bySlug = tours.ToDictionary(x => x.Slug, x => Key(x.Id));
        var t = await Load(Tour, bySlug.Values, ct);
        var om = await OperatorNames(ct);
        return list.Select(b => b with
        {
            Title = b.TourSlug != null && bySlug.TryGetValue(b.TourSlug, out var id) ? Pick(t, id, "Title", b.Title) : b.Title,
            OperatorName = Map(om, b.OperatorName)
        }).ToList();
    }

    public async Task<BookingDto> Apply(BookingDto b, CancellationToken ct) => (await Apply([b], ct))[0];

    // ---------- Подробные страницы ----------

    public async Task<DestinationDto> Apply(DestinationDto x, CancellationToken ct)
    {
        if (Skip) return x;
        var t = await Load(Destination, [Key(x.Id)], ct);
        var id = Key(x.Id);
        var highlights = Pick(t, id, "Highlights", "");
        return x with
        {
            Name = Pick(t, id, "Name", x.Name), Tagline = Pick(t, id, "Tagline", x.Tagline), Summary = Pick(t, id, "Summary", x.Summary),
            Description = Pick(t, id, "Description", x.Description), BestTime = x.BestTime is null ? null : Pick(t, id, "BestTime", x.BestTime),
            Highlights = highlights.Length > 0 ? Projections.Lines(highlights) : x.Highlights,
            Untranslated = !t.ContainsKey((id, "Description")), Photos = Alt(x.Photos, Pick(t, id, "Name", x.Name)),
            Region = (await Apply([x.Region], ct))[0], Categories = await Apply(x.Categories, ct),
            Attractions = await Apply(x.Attractions, ct), Nearby = await Apply(x.Nearby, ct), Tours = await Apply(x.Tours, ct), Articles = await Apply(x.Articles, ct)
        };
    }

    public async Task<PoiDto> Apply(PoiDto x, CancellationToken ct)
    {
        if (Skip) return x;
        var id = Key(x.Id);
        var t = await Load(Poi, [id], ct);
        return x with
        {
            Name = Pick(t, id, "Name", x.Name), Summary = Pick(t, id, "Summary", x.Summary), Description = Pick(t, id, "Description", x.Description),
            Season = x.Season is null ? null : Pick(t, id, "Season", x.Season), Region = (await Apply([x.Region], ct))[0],
            Untranslated = !string.IsNullOrEmpty(x.Description) && !t.ContainsKey((id, "Description")), Photos = Alt(x.Photos, Pick(t, id, "Name", x.Name)),
            Destination = x.Destination is null ? null : (await Apply([x.Destination], ct))[0],
            Nearby = await Apply(x.Nearby, ct), Tours = await Apply(x.Tours, ct)
        };
    }

    public async Task<TourDto> Apply(TourDto x, CancellationToken ct)
    {
        if (Skip) return x;
        var id = Key(x.Id);
        var t = await Load(Tour, [id], ct);
        var pois = await Load(Poi, x.Points.Select(p => Key(p.PoiId)), ct);
        var notes = await Load(TourPoint, x.Points.Select(p => $"{id}:{p.Order}"), ct);
        var ops = await Load(Operator, [Key(x.Operator.Id)], ct);
        var rec = Pick(t, id, "Recommendations", "");
        var inc = Pick(t, id, "Includes", "");
        return x with
        {
            Title = Pick(t, id, "Title", x.Title), Summary = Pick(t, id, "Summary", x.Summary), Description = Pick(t, id, "Description", x.Description),
            Untranslated = !t.ContainsKey((id, "Description")), Photos = Alt(x.Photos, Pick(t, id, "Title", x.Title)),
            Operator = x.Operator with { Name = Pick(ops, Key(x.Operator.Id), "Name", x.Operator.Name), Description = Pick(ops, Key(x.Operator.Id), "Description", x.Operator.Description) },
            Recommendations = rec.Length > 0 ? Projections.Lines(rec) : x.Recommendations,
            Includes = inc.Length > 0 ? Projections.Lines(inc) : x.Includes,
            Region = (await Apply([x.Region], ct))[0], Category = (await Apply([x.Category], ct))[0],
            Points = x.Points.Select(p => p with { Name = Pick(pois, Key(p.PoiId), "Name", p.Name), Note = p.Note is null ? null : Pick(notes, $"{id}:{p.Order}", "Note", p.Note) }).ToList(),
            Reviews = x.Reviews
        };
    }

    public async Task<ArticleDto> Apply(ArticleDto x, CancellationToken ct)
    {
        if (Skip) return x;
        var id = Key(x.Id);
        var t = await Load(Article, [id], ct);
        return x with
        {
            Title = Pick(t, id, "Title", x.Title), Lead = Pick(t, id, "Lead", x.Lead), Body = Pick(t, id, "Body", x.Body),
            Topic = Pick(t, id, "Topic", x.Topic), AuthorName = Pick(t, id, "AuthorName", x.AuthorName),
            Untranslated = !t.ContainsKey((id, "Body")), Photos = Alt(x.Photos, Pick(t, id, "Title", x.Title)),
            Destination = x.Destination is null ? null : (await Apply([x.Destination], ct))[0], Related = await Apply(x.Related, ct)
        };
    }

    /// <summary>Есть ли перевод основного текста — чтобы интерфейс мог сообщить, что текст доступен только на русском.</summary>
    public async Task<bool> HasField(string type, string id, string field, CancellationToken ct) =>
        Skip || await db.Translations.AnyAsync(t => t.EntityType == type && t.EntityId == id && t.Field == field && t.Lang == Lang, ct);

    /// <summary>Сущности, у которых есть перевод, содержащий строку поиска (для поиска на английском и кыргызском).</summary>
    public IQueryable<string> SearchIds(string type, string q) =>
        db.Translations.Where(t => t.EntityType == type && t.Lang == Lang && t.Value.Contains(q)).Select(t => t.EntityId);
}
