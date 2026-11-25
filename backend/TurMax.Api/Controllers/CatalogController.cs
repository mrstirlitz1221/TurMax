using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Модуль Catalog: публичные справочники, направления, точки, статьи, поиск, карта (FR-01 – FR-03).</summary>
[ApiController]
[Route("api")]
public class CatalogController(AppDbContext db, TranslationService tr) : ControllerBase
{
    [HttpGet("regions")]
    public async Task<IReadOnlyList<RegionDto>> Regions(CancellationToken ct) =>
        await tr.Apply(await db.Regions.OrderBy(r => r.Id).Select(r => new RegionDto(r.Id, r.Name, r.Slug, r.Center)).ToListAsync(ct), ct);

    [HttpGet("categories")]
    public async Task<IReadOnlyList<CategoryDto>> Categories(CancellationToken ct) =>
        await tr.Apply(await db.Categories.OrderBy(c => c.SortOrder).Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Tagline, c.Description, c.ImageUrl, c.ImageCredit,
            db.Tours.Count(t => t.CategoryId == c.Id && t.Status == TourStatus.Published && t.Operator.Verification == VerificationStatus.Verified),
            c.Destinations.Count)).ToListAsync(ct), ct);

    [HttpGet("categories/{slug}")]
    public async Task<ActionResult<CategoryDto>> Category(string slug, CancellationToken ct) =>
        (await tr.Apply([await db.Categories.Where(c => c.Slug == slug).Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Tagline, c.Description, c.ImageUrl, c.ImageCredit,
            db.Tours.Count(t => t.CategoryId == c.Id && t.Status == TourStatus.Published && t.Operator.Verification == VerificationStatus.Verified),
            c.Destinations.Count)).FirstOrDefaultAsync(ct) ?? throw AppException.NotFound("Категория не найдена")], ct))[0];

    // ---------- Направления ----------

    [HttpGet("destinations")]
    public async Task<IReadOnlyList<DestinationCardDto>> Destinations([FromQuery] string? category, [FromQuery] string? region,
        [FromQuery] string? q, [FromQuery] bool? featured, CancellationToken ct)
    {
        var query = db.Destinations.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(d => d.Categories.Any(c => c.Slug == category));
        if (!string.IsNullOrWhiteSpace(region)) query = query.Where(d => d.Region.Slug == region);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim();
            var ids = tr.SearchIds(TranslationService.Destination, s);
            query = query.Where(d => d.Name.Contains(s) || d.Summary.Contains(s) || ids.Contains(d.Id.ToString()));
        }
        if (featured == true) query = query.Where(d => d.IsFeatured);
        return await tr.Apply(await query.OrderBy(d => d.SortOrder).ThenBy(d => d.Name).Select(Projections.DestinationCard).ToListAsync(ct), ct);
    }

    [HttpGet("destinations/{slug}")]
    public async Task<ActionResult<DestinationDto>> Destination(string slug, CancellationToken ct)
    {
        var d = await db.Destinations.AsNoTracking().Include(x => x.Region).Include(x => x.Categories).Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Slug == slug, ct) ?? throw AppException.NotFound("Направление не найдено");

        var attractions = await db.Pois.Where(p => p.DestinationId == d.Id && p.IsPublished).OrderBy(p => p.Name).Select(Projections.PoiCard).ToListAsync(ct);
        var nearby = await NearbyPois(d.Latitude, d.Longitude, 120, attractions.Select(a => a.Id).ToHashSet(), 6, ct);
        var tours = await db.Tours.Where(Projections.IsPublic)
            .Where(t => t.Points.Any(p => p.Poi.DestinationId == d.Id))
            .OrderByDescending(t => t.Rating).Take(6).Select(Projections.TourCard).ToListAsync(ct);
        var articles = await db.Articles.Where(a => a.IsPublished && a.DestinationId == d.Id).OrderByDescending(a => a.PublishedAt)
            .Take(3).Select(Projections.ArticleCard).ToListAsync(ct);

        return await tr.Apply(new DestinationDto(d.Id, d.Slug, d.Name, d.Tagline, d.Summary, d.Description, d.Region.ToDto(), d.Latitude, d.Longitude,
            d.BestTime, Projections.Lines(d.Highlights),
            d.Categories.OrderBy(c => c.SortOrder).Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Tagline, c.Description, c.ImageUrl, c.ImageCredit, 0, 0)).ToList(),
            d.Photos.OrderBy(p => p.SortOrder).Select(p => p.ToDto()).ToList(), attractions, nearby, tours, articles), ct);
    }

    // ---------- Точки интереса ----------

    /// <summary>Точки в видимой области карты: bbox=minLng,minLat,maxLng,maxLat (FR-03, поиск по карте).</summary>
    [HttpGet("poi")]
    public async Task<IReadOnlyList<PoiCardDto>> Pois([FromQuery] string? bbox, [FromQuery] PoiKind? kind, [FromQuery] string? q,
        [FromQuery] string? region, CancellationToken ct)
    {
        var query = db.Pois.Where(p => p.IsPublished);
        if (!string.IsNullOrWhiteSpace(bbox))
        {
            var parts = bbox.Split(',').Select(s => decimal.TryParse(s, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : (decimal?)null).ToArray();
            if (parts.Length != 4 || parts.Any(p => p is null)) throw AppException.BadRequest("bbox: ожидается minLng,minLat,maxLng,maxLat");
            var (minLng, minLat, maxLng, maxLat) = (parts[0]!.Value, parts[1]!.Value, parts[2]!.Value, parts[3]!.Value);
            query = query.Where(p => p.Latitude >= minLat && p.Latitude <= maxLat && p.Longitude >= minLng && p.Longitude <= maxLng);
        }
        if (kind is not null) query = query.Where(p => p.Kind == kind);
        if (!string.IsNullOrWhiteSpace(region)) query = query.Where(p => p.Region.Slug == region);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim();
            var ids = tr.SearchIds(TranslationService.Poi, s);
            query = query.Where(p => p.Name.Contains(s) || p.Summary.Contains(s) || ids.Contains(p.Id.ToString()));
        }
        return await tr.Apply(await query.OrderBy(p => p.Name).Take(300).Select(Projections.PoiCard).ToListAsync(ct), ct);
    }

    [HttpGet("poi/{slug}")]
    public async Task<ActionResult<PoiDto>> Poi(string slug, CancellationToken ct)
    {
        var p = await db.Pois.AsNoTracking().Include(x => x.Region).Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, ct) ?? throw AppException.NotFound("Место не найдено");
        var dest = p.DestinationId is null ? null :
            await db.Destinations.Where(d => d.Id == p.DestinationId).Select(Projections.DestinationCard).FirstOrDefaultAsync(ct);
        var nearby = await NearbyPois(p.Latitude, p.Longitude, 80, [p.Id], 6, ct);
        var tours = await db.Tours.Where(Projections.IsPublic).Where(t => t.Points.Any(tp => tp.PoiId == p.Id))
            .OrderByDescending(t => t.Rating).Take(6).Select(Projections.TourCard).ToListAsync(ct);
        return await tr.Apply(new PoiDto(p.Id, p.Slug, p.Name, p.Kind, p.Summary, p.Description, p.Region.ToDto(), p.Latitude, p.Longitude, p.AltitudeM,
            p.RoadType, p.EntryFee, p.LodgingPrice, p.NeedsPermit, p.Season, p.Photos.OrderBy(x => x.SortOrder).Select(x => x.ToDto()).ToList(),
            dest, nearby, tours), ct);
    }

    /// <summary>Ближайшие точки: грубый отбор по прямоугольнику в SQL, точная сортировка по расстоянию гаверсинуса.</summary>
    async Task<List<PoiCardDto>> NearbyPois(decimal lat, decimal lng, double radiusKm, HashSet<Guid> exclude, int take, CancellationToken ct)
    {
        var dLat = (decimal)(radiusKm / 111.0);
        var dLng = (decimal)(radiusKm / (111.0 * Math.Cos((double)lat * Math.PI / 180)));
        var candidates = await db.Pois.Where(p => p.IsPublished && p.Latitude >= lat - dLat && p.Latitude <= lat + dLat
                                                 && p.Longitude >= lng - dLng && p.Longitude <= lng + dLng)
            .Select(Projections.PoiCard).ToListAsync(ct);
        var origin = new GeoPoint((double)lat, (double)lng);
        return candidates.Where(c => !exclude.Contains(c.Id))
            .Select(c => (c, km: HaversineRoutingProvider.DistanceKm(origin, new GeoPoint((double)c.Latitude, (double)c.Longitude))))
            .Where(x => x.km <= radiusKm).OrderBy(x => x.km).Take(take).Select(x => x.c).ToList();
    }

    // ---------- Карта ----------

    /// <summary>Все точки для интерактивной карты: направления и достопримечательности.</summary>
    [HttpGet("map/points")]
    public async Task<IReadOnlyList<MapPointDto>> MapPoints(CancellationToken ct)
    {
        var dests = await db.Destinations.Select(d => new MapPointDto(d.Id, d.Slug, d.Name, "destination", null, d.Tagline, d.Latitude, d.Longitude,
            d.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault(), "/destinations/" + d.Slug)).ToListAsync(ct);
        var pois = await db.Pois.Where(p => p.IsPublished).Select(p => new MapPointDto(p.Id, p.Slug, p.Name, "poi", p.Kind, p.Summary, p.Latitude, p.Longitude,
            p.Photos.OrderBy(x => x.SortOrder).Select(x => x.Url).FirstOrDefault(), "/attractions/" + p.Slug)).ToListAsync(ct);
        return await tr.Apply(dests.Concat(pois), ct);
    }

    // ---------- Статьи ----------

    [HttpGet("articles")]
    public async Task<PagedResult<ArticleCardDto>> Articles([FromQuery] string? topic, [FromQuery] int page = 1, [FromQuery] int pageSize = 12, CancellationToken ct = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 48);
        var q = db.Articles.Where(a => a.IsPublished);
        if (!string.IsNullOrWhiteSpace(topic)) q = q.Where(a => a.Topic == topic);
        var total = await q.CountAsync(ct);
        var items = await tr.Apply(await q.OrderByDescending(a => a.PublishedAt).Skip((page - 1) * pageSize).Take(pageSize).Select(Projections.ArticleCard).ToListAsync(ct), ct);
        return new PagedResult<ArticleCardDto>(items, total, page, pageSize);
    }

    public record TopicDto(string Value, string Label);

    /// <summary>Рубрики журнала: value — ключ фильтра (исходное название), label — название на языке запроса.</summary>
    [HttpGet("articles/topics")]
    public async Task<IReadOnlyList<TopicDto>> ArticleTopics(CancellationToken ct)
    {
        var rows = await db.Articles.Where(a => a.IsPublished).Select(a => new { a.Id, a.Topic }).ToListAsync(ct);
        var cards = await tr.Apply(rows.Select(r => new ArticleCardDto(r.Id, "", "", "", r.Topic, 0, DateTime.MinValue, null)), ct);
        return rows.Zip(cards).GroupBy(x => x.First.Topic).Select(g => new TopicDto(g.Key, g.First().Second.Topic)).OrderBy(t => t.Label).ToList();
    }

    [HttpGet("articles/{slug}")]
    public async Task<ActionResult<ArticleDto>> Article(string slug, CancellationToken ct)
    {
        var a = await db.Articles.AsNoTracking().Include(x => x.Photos).FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, ct)
                ?? throw AppException.NotFound("Статья не найдена");
        var dest = a.DestinationId is null ? null :
            await db.Destinations.Where(d => d.Id == a.DestinationId).Select(Projections.DestinationCard).FirstOrDefaultAsync(ct);
        var related = await db.Articles.Where(x => x.IsPublished && x.Id != a.Id).OrderBy(x => x.Topic == a.Topic ? 0 : 1)
            .ThenByDescending(x => x.PublishedAt).Take(3).Select(Projections.ArticleCard).ToListAsync(ct);
        return await tr.Apply(new ArticleDto(a.Id, a.Slug, a.Title, a.Lead, a.Body, a.Topic, a.AuthorName, a.ReadingMinutes, a.PublishedAt,
            a.Photos.OrderBy(p => p.SortOrder).Select(p => p.ToDto()).ToList(), dest, related), ct);
    }

    // ---------- Поиск ----------

    /// <summary>Сквозной поиск по направлениям, местам, турам и статьям (FR-03).</summary>
    [HttpGet("search")]
    public async Task<SearchResultDto> Search([FromQuery] string q, CancellationToken ct)
    {
        q = (q ?? "").Trim();
        if (q.Length < 2) return new SearchResultDto([], [], [], []);
        var dIds = tr.SearchIds(TranslationService.Destination, q);
        var pIds = tr.SearchIds(TranslationService.Poi, q);
        var tIds = tr.SearchIds(TranslationService.Tour, q);
        var aIds = tr.SearchIds(TranslationService.Article, q);
        return new SearchResultDto(
            await tr.Apply(await db.Destinations.Where(d => d.Name.Contains(q) || d.Summary.Contains(q) || d.Tagline.Contains(q) || dIds.Contains(d.Id.ToString()))
                .OrderBy(d => d.SortOrder).Take(8).Select(Projections.DestinationCard).ToListAsync(ct), ct),
            await tr.Apply(await db.Pois.Where(p => p.IsPublished && (p.Name.Contains(q) || p.Summary.Contains(q) || pIds.Contains(p.Id.ToString())))
                .OrderBy(p => p.Name).Take(12).Select(Projections.PoiCard).ToListAsync(ct), ct),
            await tr.Apply(await db.Tours.Where(Projections.IsPublic).Where(t => t.Title.Contains(q) || t.Summary.Contains(q) || t.Region.Name.Contains(q) || tIds.Contains(t.Id.ToString()))
                .OrderByDescending(t => t.Rating).Take(8).Select(Projections.TourCard).ToListAsync(ct), ct),
            await tr.Apply(await db.Articles.Where(a => a.IsPublished && (a.Title.Contains(q) || a.Lead.Contains(q) || aIds.Contains(a.Id.ToString())))
                .OrderByDescending(a => a.PublishedAt).Take(6).Select(Projections.ArticleCard).ToListAsync(ct), ct));
    }
}
