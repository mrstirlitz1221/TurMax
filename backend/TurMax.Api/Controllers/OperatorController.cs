using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Кабинет оператора (FR-13 – FR-16). Каждая операция проверяет, что объект принадлежит оператору.</summary>
[ApiController]
[Route("api/operator")]
[Authorize(Roles = Roles.Operator)]
public class OperatorController(AppDbContext db, BookingService bookings, AuditService audit, TranslationService tr) : ControllerBase
{
    Guid OpId => User.OperatorId();

    async Task<Operator> CurrentAsync(CancellationToken ct) =>
        await db.Operators.FirstOrDefaultAsync(o => o.Id == OpId, ct) ?? throw AppException.Forbidden("Профиль оператора не найден");

    // ---------- Профиль ----------

    [HttpGet("profile")]
    public async Task<OperatorProfileDto> Profile(CancellationToken ct) => ToDto(await CurrentAsync(ct));

    [HttpPut("profile")]
    public async Task<OperatorProfileDto> UpdateProfile(OperatorProfileRequest req, CancellationToken ct)
    {
        var o = await CurrentAsync(ct);
        o.Name = req.Name.Trim(); o.Kind = req.Kind; o.Description = req.Description.Trim(); o.Phone = req.Phone;
        o.Email = req.Email; o.Website = req.Website; o.Margin = req.Margin;
        audit.Log("operator.profile_updated", "Operator", o.Id);
        await db.SaveChangesAsync(ct);
        return ToDto(o);
    }

    static OperatorProfileDto ToDto(Operator o) => new(o.Id, o.Name, o.Slug, o.Kind, o.Description, o.Phone, o.Email, o.Website, o.Margin,
        o.Verification, o.Rating, o.ReviewsCount);

    // ---------- Туры ----------

    [HttpGet("tours")]
    public async Task<IReadOnlyList<OperatorTourDto>> Tours(CancellationToken ct) =>
        await db.Tours.Where(t => t.OperatorId == OpId).OrderByDescending(t => t.UpdatedAt)
            .Select(t => new OperatorTourDto(t.Id, t.Slug, t.Title, t.Status, t.ModerationNote, t.Days, t.PriceFrom, t.Views, t.Rating, t.ReviewsCount,
                t.Departures.Count, db.Bookings.Count(b => b.Departure!.TourId == t.Id),
                t.Photos.OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault(), t.UpdatedAt))
            .ToListAsync(ct);

    async Task<Tour> OwnedTourAsync(Guid id, CancellationToken ct)
    {
        var t = await db.Tours.Include(x => x.Points).Include(x => x.Photos).Include(x => x.Departures).AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null || t.OperatorId != OpId) throw AppException.NotFound("Тур не найден");
        return t;
    }

    [HttpGet("tours/{id:guid}")]
    public async Task<TourEditDto> Tour(Guid id, CancellationToken ct) => ToEdit(await OwnedTourAsync(id, ct));

    static TourEditDto ToEdit(Tour t) => new(t.Id, t.Slug, t.Title, t.Summary, t.Description, t.RegionId, t.CategoryId, t.Days, t.Difficulty,
        t.SeasonFromMonth, t.SeasonToMonth, t.MaxAltitudeM, t.DistanceKm, t.PriceFrom, t.GuideLanguages, t.Recommendations, t.Includes,
        t.NeedsPermit, t.Status, t.ModerationNote,
        t.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).Select(p => new TourPointInput { PoiId = p.PoiId, Day = p.Day, Note = p.Note }).ToList(),
        t.Photos.OrderBy(p => p.SortOrder).Select(p => new PhotoInput { Url = p.Url, Alt = p.Alt, Author = p.Author, License = p.License, SourceUrl = p.SourceUrl }).ToList(),
        t.Departures.OrderBy(d => d.StartDate).Select(d => new DepartureDto(d.Id, d.StartDate, d.Price, d.SeatsTotal, d.SeatsAvailable)).ToList());

    [HttpPost("tours")]
    public async Task<ActionResult<TourEditDto>> CreateTour(TourUpsertRequest req, CancellationToken ct)
    {
        var o = await CurrentAsync(ct);
        var t = new Tour { OperatorId = o.Id, Status = TourStatus.Draft };
        await ApplyAsync(t, req, ct);
        var slug = Text.Slugify(req.Title);
        t.Slug = await db.Tours.AnyAsync(x => x.Slug == slug, ct) ? $"{slug}-{Guid.NewGuid().ToString("N")[..6]}" : slug;
        db.Tours.Add(t);
        audit.Log("tour.created", "Tour", t.Id, t.Title);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Tour), new { id = t.Id }, ToEdit(await OwnedTourAsync(t.Id, ct)));
    }

    [HttpPut("tours/{id:guid}")]
    public async Task<TourEditDto> UpdateTour(Guid id, TourUpsertRequest req, CancellationToken ct)
    {
        var t = await OwnedTourAsync(id, ct);
        await ApplyAsync(t, req, ct);
        // Существенные изменения опубликованного тура снова проходят модерацию (FR-18).
        if (t.Status is TourStatus.Published or TourStatus.Rejected) t.Status = TourStatus.Pending;
        t.UpdatedAt = DateTime.UtcNow;
        audit.Log("tour.updated", "Tour", t.Id, t.Title);
        await db.SaveChangesAsync(ct);
        return ToEdit(await OwnedTourAsync(id, ct));
    }

    async Task ApplyAsync(Tour t, TourUpsertRequest req, CancellationToken ct)
    {
        if (!await db.Regions.AnyAsync(r => r.Id == req.RegionId, ct)) throw AppException.BadRequest("Регион не найден");
        if (!await db.Categories.AnyAsync(c => c.Id == req.CategoryId, ct)) throw AppException.BadRequest("Категория не найдена");
        var poiIds = req.Points.Select(p => p.PoiId).Distinct().ToList();
        if (await db.Pois.CountAsync(p => poiIds.Contains(p.Id), ct) != poiIds.Count) throw AppException.BadRequest("Некоторые точки не найдены");
        if (req.Points.Any(p => p.Day > req.Days)) throw AppException.BadRequest("День точки больше длительности тура");

        t.Title = req.Title.Trim(); t.Summary = req.Summary.Trim(); t.Description = req.Description.Trim(); t.RegionId = req.RegionId;
        t.CategoryId = req.CategoryId; t.Days = req.Days; t.Difficulty = req.Difficulty; t.SeasonFromMonth = req.SeasonFromMonth;
        t.SeasonToMonth = req.SeasonToMonth; t.MaxAltitudeM = req.MaxAltitudeM; t.DistanceKm = req.DistanceKm; t.PriceFrom = req.PriceFrom;
        t.GuideLanguages = req.GuideLanguages; t.Recommendations = req.Recommendations.Trim(); t.Includes = req.Includes.Trim();
        t.NeedsPermit = req.NeedsPermit;

        db.TourPoints.RemoveRange(t.Points);
        t.Points.Clear();
        var order = 0;
        foreach (var p in req.Points.Select((p, i) => (p, i)).OrderBy(x => x.p.Day).ThenBy(x => x.i))
            t.Points.Add(new TourPoint { TourId = t.Id, PoiId = p.p.PoiId, Day = p.p.Day, Order = ++order, Note = p.p.Note });

        db.Photos.RemoveRange(t.Photos);
        t.Photos.Clear();
        foreach (var (p, i) in req.Photos.Select((p, i) => (p, i)))
            t.Photos.Add(new Photo { TourId = t.Id, Url = p.Url, Alt = p.Alt ?? t.Title, Author = p.Author, License = p.License, SourceUrl = p.SourceUrl, SortOrder = i });
    }

    /// <summary>Отправка тура на модерацию.</summary>
    [HttpPost("tours/{id:guid}/submit")]
    public async Task<TourEditDto> Submit(Guid id, CancellationToken ct)
    {
        var t = await OwnedTourAsync(id, ct);
        if (t.Points.Count == 0) throw AppException.BadRequest("Добавьте в программу хотя бы одну точку");
        if (t.Photos.Count == 0) throw AppException.BadRequest("Добавьте хотя бы одну фотографию");
        if (t.Status is not (TourStatus.Draft or TourStatus.Rejected or TourStatus.Hidden)) throw AppException.Conflict("Тур уже на модерации или опубликован");
        t.Status = TourStatus.Pending;
        t.UpdatedAt = DateTime.UtcNow;
        audit.Log("tour.submitted", "Tour", t.Id, t.Title);
        await db.SaveChangesAsync(ct);
        return ToEdit(t);
    }

    /// <summary>Снять тур с публикации.</summary>
    [HttpPost("tours/{id:guid}/hide")]
    public async Task<TourEditDto> Hide(Guid id, CancellationToken ct)
    {
        var t = await OwnedTourAsync(id, ct);
        t.Status = TourStatus.Hidden;
        audit.Log("tour.hidden", "Tour", t.Id, t.Title);
        await db.SaveChangesAsync(ct);
        return ToEdit(t);
    }

    [HttpPost("tours/{id:guid}/departures")]
    public async Task<ActionResult<DepartureDto>> AddDeparture(Guid id, DepartureRequest req, CancellationToken ct)
    {
        var t = await OwnedTourAsync(id, ct);
        if (req.StartDate <= DateOnly.FromDateTime(DateTime.UtcNow)) throw AppException.BadRequest("Дата выезда должна быть в будущем");
        var d = new Departure { TourId = t.Id, StartDate = req.StartDate, Price = req.Price, SeatsTotal = req.SeatsTotal, SeatsAvailable = req.SeatsTotal };
        db.Departures.Add(d);
        audit.Log("departure.created", "Departure", d.Id, $"{t.Title}: {d.StartDate:yyyy-MM-dd}");
        await db.SaveChangesAsync(ct);
        return Created("", new DepartureDto(d.Id, d.StartDate, d.Price, d.SeatsTotal, d.SeatsAvailable));
    }

    [HttpDelete("departures/{id:guid}")]
    public async Task<IActionResult> DeleteDeparture(Guid id, CancellationToken ct)
    {
        var d = await db.Departures.Include(x => x.Tour).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null || d.Tour.OperatorId != OpId) throw AppException.NotFound("Выезд не найден");
        if (await db.Bookings.AnyAsync(b => b.DepartureId == id, ct)) throw AppException.Conflict("На выезд есть заявки — удалить нельзя");
        db.Departures.Remove(d);
        audit.Log("departure.deleted", "Departure", id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Тарифы ----------

    [HttpGet("services")]
    public async Task<IReadOnlyList<ServiceDto>> Services(CancellationToken ct) =>
        await db.Services.Where(s => s.OperatorId == OpId).OrderBy(s => s.Type).ThenBy(s => s.Name)
            .Select(s => new ServiceDto(s.Id, s.Type, s.VehicleType, s.Name, s.Price, s.RegionId)).ToListAsync(ct);

    [HttpPost("services")]
    public async Task<ServiceDto> AddService(ServiceRequest req, CancellationToken ct)
    {
        if (req.Type == ServiceType.Transport && req.VehicleType is null) throw AppException.BadRequest("Для транспорта укажите тип машины");
        var s = new Service { OperatorId = OpId, Type = req.Type, VehicleType = req.Type == ServiceType.Transport ? req.VehicleType : null, Name = req.Name.Trim(), Price = req.Price, RegionId = req.RegionId };
        db.Services.Add(s);
        audit.Log("service.created", "Service", s.Id, $"{s.Type}: {s.Price}");
        await db.SaveChangesAsync(ct);
        return new ServiceDto(s.Id, s.Type, s.VehicleType, s.Name, s.Price, s.RegionId);
    }

    [HttpPut("services/{id:guid}")]
    public async Task<ServiceDto> UpdateService(Guid id, ServiceRequest req, CancellationToken ct)
    {
        var s = await db.Services.FirstOrDefaultAsync(x => x.Id == id && x.OperatorId == OpId, ct) ?? throw AppException.NotFound("Тариф не найден");
        if (req.Type == ServiceType.Transport && req.VehicleType is null) throw AppException.BadRequest("Для транспорта укажите тип машины");
        s.Type = req.Type; s.VehicleType = req.Type == ServiceType.Transport ? req.VehicleType : null; s.Name = req.Name.Trim(); s.Price = req.Price; s.RegionId = req.RegionId;
        audit.Log("service.updated", "Service", s.Id, $"{s.Type}: {s.Price}");
        await db.SaveChangesAsync(ct);
        return new ServiceDto(s.Id, s.Type, s.VehicleType, s.Name, s.Price, s.RegionId);
    }

    [HttpDelete("services/{id:guid}")]
    public async Task<IActionResult> DeleteService(Guid id, CancellationToken ct)
    {
        var n = await db.Services.Where(x => x.Id == id && x.OperatorId == OpId).ExecuteDeleteAsync(ct);
        if (n == 0) throw AppException.NotFound("Тариф не найден");
        audit.Log("service.deleted", "Service", id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Заявки ----------

    [HttpGet("bookings")]
    public async Task<IReadOnlyList<BookingDto>> Bookings([FromQuery] BookingStatus? status, CancellationToken ct)
    {
        var q = db.Bookings.Where(b => b.OperatorId == OpId);
        if (status is not null) q = q.Where(b => b.Status == status);
        var list = await q.Include(b => b.User).Include(b => b.Operator).Include(b => b.Departure).ThenInclude(d => d!.Tour)
            .Include(b => b.Route).Include(b => b.Review).Include(b => b.History).ThenInclude(h => h.ChangedBy)
            .AsSplitQuery().OrderByDescending(b => b.CreatedAt).Take(200).ToListAsync(ct);
        return await tr.Apply(list.Select(b => BookingService.ToDto(b, true, Langs.Of(HttpContext))), ct);
    }

    [HttpGet("bookings/{id:guid}")]
    public async Task<object> Booking(Guid id, CancellationToken ct)
    {
        var b = await bookings.GetForOperatorAsync(id, OpId, User.UserId(), ct);
        var route = b.RouteId is { } rid
            ? await db.RoutePoints.Where(p => p.RouteId == rid).OrderBy(p => p.Day).ThenBy(p => p.Order)
                .Select(p => new { p.Day, p.Nights, p.Poi.Name, p.Poi.Slug }).ToListAsync(ct)
            : null;
        return new { booking = await tr.Apply(BookingService.ToDto(b, true, Langs.Of(HttpContext)), ct), routePoints = route };
    }

    /// <summary>Подтверждение, отклонение или изменение цены (PATCH /api/operator/bookings/{id}).</summary>
    [HttpPatch("bookings/{id:guid}")]
    public async Task<BookingDto> Act(Guid id, OperatorBookingAction req, CancellationToken ct) =>
        await tr.Apply(BookingService.ToDto(await bookings.OperatorActionAsync(id, OpId, User.UserId(), req, ct), true, Langs.Of(HttpContext)), ct);

    // ---------- Отзывы ----------

    [HttpGet("reviews")]
    public async Task<IReadOnlyList<OperatorReviewDto>> Reviews(CancellationToken ct) =>
        await db.Reviews.Where(r => r.OperatorId == OpId).OrderByDescending(r => r.CreatedAt)
            .Select(r => new OperatorReviewDto(r.Id, r.User.FullName, r.Rating, r.Text, r.OperatorReply, r.CreatedAt, r.Tour != null ? r.Tour.Title : "Свой маршрут", r.Status))
            .ToListAsync(ct);

    [HttpPost("reviews/{id:guid}/reply")]
    public async Task<IActionResult> Reply(Guid id, ReplyRequest req, CancellationToken ct)
    {
        var r = await db.Reviews.FirstOrDefaultAsync(x => x.Id == id && x.OperatorId == OpId, ct) ?? throw AppException.NotFound("Отзыв не найден");
        r.OperatorReply = req.Text.Trim();
        audit.Log("review.replied", "Review", r.Id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Статистика ----------

    [HttpGet("stats")]
    public async Task<OperatorStatsDto> Stats(CancellationToken ct)
    {
        var o = await CurrentAsync(ct);
        var tours = await db.Tours.Where(t => t.OperatorId == o.Id)
            .Select(t => new { t.Title, t.Views, t.Status, Bookings = db.Bookings.Count(b => b.Departure!.TourId == t.Id) }).ToListAsync(ct);
        var b = db.Bookings.Where(x => x.OperatorId == o.Id);
        var revenue = await b.Where(x => x.Status == BookingStatus.Confirmed || x.Status == BookingStatus.Completed)
            .SumAsync(x => (decimal?)(x.PriceFinal ?? x.PriceCalc), ct) ?? 0;
        return new OperatorStatsDto(tours.Count(t => t.Status == TourStatus.Published), tours.Count, tours.Sum(t => t.Views),
            await b.CountAsync(ct), await b.CountAsync(x => x.Status == BookingStatus.New || x.Status == BookingStatus.InReview, ct),
            await b.CountAsync(x => x.Status == BookingStatus.Confirmed, ct), await b.CountAsync(x => x.Status == BookingStatus.Completed, ct),
            revenue, o.Rating, o.ReviewsCount,
            tours.OrderByDescending(t => t.Views).Select(t => new TourStatRow(t.Title, t.Views, t.Bookings,
                t.Views == 0 ? 0 : Math.Round(t.Bookings * 100m / t.Views, 1))).ToList());
    }
}
