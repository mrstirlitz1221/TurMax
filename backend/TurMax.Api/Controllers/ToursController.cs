using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Каталог туров-маршрутов с фильтрами (FR-01) и страница тура (FR-02).</summary>
[ApiController]
[Route("api/tours")]
public class ToursController(AppDbContext db, TranslationService tr) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<TourCardDto>> List([FromQuery] TourQuery f, CancellationToken ct)
    {
        var q = db.Tours.Where(Projections.IsPublic);
        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var s = f.Q.Trim();
            var ids = tr.SearchIds(TranslationService.Tour, s);
            q = q.Where(t => t.Title.Contains(s) || t.Summary.Contains(s) || ids.Contains(t.Id.ToString()));
        }
        if (!string.IsNullOrWhiteSpace(f.Region)) q = q.Where(t => t.Region.Slug == f.Region);
        if (!string.IsNullOrWhiteSpace(f.Category)) q = q.Where(t => t.Category.Slug == f.Category);
        if (!string.IsNullOrWhiteSpace(f.Destination)) q = q.Where(t => t.Points.Any(p => p.Poi.Destination!.Slug == f.Destination));
        if (f.DaysMin is { } dmin) q = q.Where(t => t.Days >= dmin);
        if (f.DaysMax is { } dmax) q = q.Where(t => t.Days <= dmax);
        if (f.Difficulty is { } diff) q = q.Where(t => t.Difficulty == diff);
        if (f.PriceMax is { } pmax) q = q.Where(t => t.PriceFrom <= pmax);
        if (!string.IsNullOrWhiteSpace(f.Lang)) q = q.Where(t => t.GuideLanguages.Contains(f.Lang));
        if (f.Month is { } m)
            q = q.Where(t => t.SeasonFromMonth <= t.SeasonToMonth
                ? m >= t.SeasonFromMonth && m <= t.SeasonToMonth
                : m >= t.SeasonFromMonth || m <= t.SeasonToMonth);

        q = f.Sort switch
        {
            "price" => q.OrderBy(t => t.PriceFrom),
            "priceDesc" => q.OrderByDescending(t => t.PriceFrom),
            "days" => q.OrderBy(t => t.Days),
            "rating" => q.OrderByDescending(t => t.Rating).ThenByDescending(t => t.ReviewsCount),
            "new" => q.OrderByDescending(t => t.CreatedAt),
            _ => q.OrderByDescending(t => t.Views + t.ReviewsCount * 20)
        };
        var total = await q.CountAsync(ct);
        var items = await tr.Apply(await q.Skip((f.Page - 1) * f.PageSize).Take(f.PageSize).Select(Projections.TourCard).ToListAsync(ct), ct);
        return new PagedResult<TourCardDto>(items, total, f.Page, f.PageSize);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<TourDto>> Get(string slug, CancellationToken ct)
    {
        var t = await db.Tours.Include(x => x.Region).Include(x => x.Category).Include(x => x.Operator).Include(x => x.Photos)
            .Include(x => x.Points).ThenInclude(p => p.Poi)
            .Include(x => x.Departures)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Slug == slug, ct);
        if (t is null || t.Status != TourStatus.Published || t.Operator.Verification != VerificationStatus.Verified)
            throw AppException.NotFound("Тур не найден");

        // Статистика просмотров для оператора (FR-16).
        await db.Tours.Where(x => x.Id == t.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.Views, x => x.Views + 1), ct);
        return await tr.Apply(await ToDtoAsync(db, t, ct), ct);
    }

    public static async Task<TourDto> ToDtoAsync(AppDbContext db, Tour t, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var reviews = await db.Reviews.Where(r => r.TourId == t.Id && r.Status == ReviewStatus.Published)
            .OrderByDescending(r => r.CreatedAt).Take(20)
            .Select(r => new ReviewDto(r.Id, r.User.FullName, r.Rating, r.Text, r.OperatorReply, r.CreatedAt, null)).ToListAsync(ct);
        var c = t.Category;
        var o = t.Operator;
        return new TourDto(t.Id, t.Slug, t.Title, t.Summary, t.Description, t.Region.ToDto(),
            new CategoryDto(c.Id, c.Name, c.Slug, c.Tagline, c.Description, c.ImageUrl, c.ImageCredit, 0, 0),
            t.Days, t.Difficulty, t.SeasonFromMonth, t.SeasonToMonth, t.MaxAltitudeM, t.DistanceKm, t.PriceFrom,
            t.GuideLanguages.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            Projections.Lines(t.Recommendations), Projections.Lines(t.Includes), t.NeedsPermit, t.Rating, t.ReviewsCount,
            t.Photos.OrderBy(p => p.SortOrder).Select(p => p.ToDto()).ToList(),
            t.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).Select(p => new TourPointDto(p.PoiId, p.Poi.Slug, p.Poi.Name, p.Poi.Kind, p.Day, p.Order, p.Note,
                p.Poi.Latitude, p.Poi.Longitude, p.Poi.AltitudeM)).ToList(),
            t.Departures.Where(d => d.StartDate > today).OrderBy(d => d.StartDate)
                .Select(d => new DepartureDto(d.Id, d.StartDate, d.Price, d.SeatsTotal, d.SeatsAvailable)).ToList(),
            new OperatorPublicDto(o.Id, o.Name, o.Slug, o.Kind, o.Description, o.Rating, o.ReviewsCount, o.Verification == VerificationStatus.Verified, o.IsDemo),
            reviews, t.Status);
    }
}
