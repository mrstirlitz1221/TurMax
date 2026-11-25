using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Конструктор маршрута (FR-05 – FR-07, FR-10). Доступ — только туристу-владельцу (матрица доступа, табл. 2.8).</summary>
[ApiController]
[Route("api/routes")]
[Authorize(Roles = Roles.Tourist)]
public class RoutesController(AppDbContext db, RouteService routes) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<RouteSummaryDto>> Mine(CancellationToken ct)
    {
        var uid = User.UserId();
        return await db.UserRoutes.Where(r => r.UserId == uid).OrderByDescending(r => r.UpdatedAt)
            .Select(r => new RouteSummaryDto(r.Id, r.Title, r.Participants, r.Points.Max(p => (int?)p.Day) ?? 0, r.Points.Count, r.UpdatedAt,
                r.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).SelectMany(p => p.Poi.Photos).OrderBy(p => p.SortOrder).Select(p => p.Url).FirstOrDefault()))
            .ToListAsync(ct);
    }

    [HttpPost]
    public async Task<ActionResult<RouteDto>> Create(RouteUpsertRequest req, CancellationToken ct)
    {
        await routes.ValidateOperatorAsync(req.OperatorId, ct);
        var r = new UserRoute
        {
            UserId = User.UserId(), Title = req.Title.Trim(), Participants = req.Participants, StartDate = req.StartDate,
            VehicleType = req.VehicleType, WithGuide = req.WithGuide, OperatorId = req.OperatorId
        };
        db.UserRoutes.Add(r);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = r.Id }, RouteService.ToDto(await routes.GetOwnedAsync(r.Id, r.UserId, ct)));
    }

    [HttpGet("{id:guid}")]
    public async Task<RouteDto> Get(Guid id, CancellationToken ct) => RouteService.ToDto(await routes.GetOwnedAsync(id, User.UserId(), ct));

    [HttpPut("{id:guid}")]
    public async Task<RouteDto> Update(Guid id, RouteUpsertRequest req, CancellationToken ct)
    {
        var r = await routes.GetOwnedAsync(id, User.UserId(), ct);
        await routes.ValidateOperatorAsync(req.OperatorId, ct);
        r.Title = req.Title.Trim(); r.Participants = req.Participants; r.StartDate = req.StartDate;
        r.VehicleType = req.VehicleType; r.WithGuide = req.WithGuide; r.OperatorId = req.OperatorId; r.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return RouteService.ToDto(await routes.GetOwnedAsync(id, r.UserId, ct));
    }

    /// <summary>Сохранение точек по дням (PUT /api/routes/{id}/points).</summary>
    [HttpPut("{id:guid}/points")]
    public async Task<RouteDto> Points(Guid id, RoutePointsRequest req, CancellationToken ct)
    {
        var r = await routes.GetOwnedAsync(id, User.UserId(), ct);
        await routes.ReplacePointsAsync(r, req.Points, ct);
        return RouteService.ToDto(await routes.GetOwnedAsync(id, r.UserId, ct));
    }

    [HttpPost("{id:guid}/copy")]
    public async Task<ActionResult<RouteDto>> Copy(Guid id, CancellationToken ct)
    {
        var src = await routes.GetOwnedAsync(id, User.UserId(), ct);
        var copy = new UserRoute
        {
            UserId = src.UserId, Title = Truncate(src.Title + " (копия)", 160), Participants = src.Participants,
            StartDate = src.StartDate, VehicleType = src.VehicleType, WithGuide = src.WithGuide, OperatorId = src.OperatorId,
            Points = src.Points.Select(p => new RoutePoint { PoiId = p.PoiId, Day = p.Day, Order = p.Order, Nights = p.Nights }).ToList()
        };
        db.UserRoutes.Add(copy);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = copy.Id }, RouteService.ToDto(await routes.GetOwnedAsync(copy.Id, copy.UserId, ct)));
    }

    static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var r = await routes.GetOwnedAsync(id, User.UserId(), ct);
        if (await db.Bookings.AnyAsync(b => b.RouteId == id, ct))
            throw AppException.Conflict("По маршруту есть заявки — его нельзя удалить. Сделайте копию для изменений");
        db.UserRoutes.Remove(r);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Расчёт сметы маршрута (п. 2.6, листинг 2.1).</summary>
    [HttpPost("{id:guid}/estimate")]
    public async Task<object> Estimate(Guid id, CancellationToken ct)
    {
        var r = await routes.GetOwnedAsync(id, User.UserId(), ct);
        var (e, op) = await routes.EstimateAsync(r, ct);
        return new
        {
            routeId = r.Id, operatorId = op.Id, operatorName = op.Name, e.Participants, e.Days, e.DistanceKm, e.WeightedDistanceKm, e.Vehicles,
            e.DrivingHoursByDay, e.Items, e.Subtotal, e.SeasonFactor, e.OperatorMargin, e.Total, e.PerPerson, e.Currency, e.Approximate,
            warnings = e.Warnings.Select(w => Messages.T(w, Langs.Of(HttpContext))),
            geometry = e.Geometry.Select(g => new[] { g.Lat, g.Lng })
        };
    }

    /// <summary>Экспорт маршрута: format=pdf|gpx.</summary>
    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> Export(Guid id, [FromQuery] string format, CancellationToken ct)
    {
        var r = await routes.GetOwnedAsync(id, User.UserId(), ct);
        var (e, op) = await routes.EstimateAsync(r, ct);
        var name = Text.Slugify(r.Title);
        if (string.IsNullOrEmpty(name)) name = "route";
        return format switch
        {
            "gpx" => File(ExportService.ToGpx(r, e), "application/gpx+xml", $"{name}.gpx"),
            "pdf" => File(ExportService.ToPdf(r, e, op.Name), "application/pdf", $"{name}.pdf"),
            _ => throw AppException.BadRequest("Формат экспорта: pdf или gpx")
        };
    }

    /// <summary>Операторы, тарифы которых можно использовать для расчёта сметы.</summary>
    [AllowAnonymous]
    [HttpGet("/api/providers")]
    public async Task<IReadOnlyList<ProviderDto>> Providers(CancellationToken ct) =>
        await db.Operators.Where(o => o.Verification == VerificationStatus.Verified && o.Services.Any(s => s.Type == ServiceType.Transport))
            .OrderByDescending(o => o.Rating)
            .Select(o => new ProviderDto(o.Id, o.Name, o.Slug, o.Kind, o.Rating, o.Margin, o.IsDemo,
                o.Services.Where(s => s.Type == ServiceType.Transport && s.VehicleType != null).Select(s => s.VehicleType!.Value).Distinct().ToList(),
                o.Services.Any(s => s.Type == ServiceType.Guide)))
            .ToListAsync(ct);
}
