using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;

namespace TurMax.Api.Services;

/// <summary>Модуль RouteBuilder: пользовательские маршруты (FR-05, FR-07) и смета (FR-06).</summary>
public class RouteService(AppDbContext db, PricingService pricing)
{
    public async Task<UserRoute> GetOwnedAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var r = await db.UserRoutes.Include(x => x.Operator)
            .Include(x => x.Points.OrderBy(p => p.Day).ThenBy(p => p.Order)).ThenInclude(p => p.Poi)
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Маршрут не найден");
        // Проверка владения объектом (п. 2.9): чужой маршрут выглядит как несуществующий.
        if (r.UserId != userId) throw AppException.NotFound("Маршрут не найден");
        return r;
    }

    public static RouteDto ToDto(UserRoute r) => new(r.Id, r.Title, r.Participants, r.StartDate, r.VehicleType, r.WithGuide,
        r.OperatorId, r.Operator?.Name, r.UpdatedAt,
        r.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).Select(p => new RoutePointDto(p.Id, p.PoiId, p.Poi.Slug, p.Poi.Name, p.Poi.Kind,
            p.Day, p.Order, p.Nights, p.Poi.Latitude, p.Poi.Longitude, p.Poi.RoadType, p.Poi.EntryFee, p.Poi.LodgingPrice, p.Poi.NeedsPermit)).ToList());

    public async Task ValidateOperatorAsync(Guid? operatorId, CancellationToken ct)
    {
        if (operatorId is null) return;
        var ok = await db.Operators.AnyAsync(o => o.Id == operatorId && o.Verification == VerificationStatus.Verified, ct);
        if (!ok) throw AppException.BadRequest("Оператор не найден или не прошёл проверку");
    }

    public async Task ReplacePointsAsync(UserRoute route, List<RoutePointInput> input, CancellationToken ct)
    {
        var ids = input.Select(p => p.PoiId).Distinct().ToList();
        var existing = await db.Pois.Where(p => ids.Contains(p.Id) && p.IsPublished).Select(p => p.Id).ToListAsync(ct);
        if (existing.Count != ids.Count) throw AppException.BadRequest("Некоторые точки не найдены");

        db.RoutePoints.RemoveRange(route.Points);
        route.Points.Clear();
        var order = 0;
        foreach (var p in input.Select((p, i) => (p, i)).OrderBy(x => x.p.Day).ThenBy(x => x.i))
            route.Points.Add(new RoutePoint { RouteId = route.Id, PoiId = p.p.PoiId, Day = p.p.Day, Nights = p.p.Nights, Order = ++order });
        route.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Тарифы оператора; без выбранного оператора — первый проверенный оператор с транспортом нужного типа.</summary>
    public async Task<(Operator op, Tariffs tariffs)> ResolveTariffsAsync(Guid? operatorId, VehicleType vehicle, CancellationToken ct)
    {
        var q = db.Operators.Include(o => o.Services).Where(o => o.Verification == VerificationStatus.Verified);
        var op = operatorId is { } id
            ? await q.FirstOrDefaultAsync(o => o.Id == id, ct)
            : await q.Where(o => o.Services.Any(s => s.Type == ServiceType.Transport && s.VehicleType == vehicle))
                     .OrderByDescending(o => o.Rating).ThenBy(o => o.Name).FirstOrDefaultAsync(ct);
        if (op is null) throw AppException.BadRequest("Нет доступного оператора для расчёта. Выберите оператора в настройках маршрута");

        decimal? Min(ServiceType t, VehicleType? v = null) =>
            op.Services.Where(s => s.Type == t && (v == null || s.VehicleType == v)).Select(s => (decimal?)s.Price).Min();

        return (op, new Tariffs(Min(ServiceType.Transport, vehicle), Min(ServiceType.Lodging), Min(ServiceType.Meals), Min(ServiceType.Guide), op.Margin));
    }

    public async Task<(EstimateResult result, Operator op)> EstimateAsync(UserRoute r, CancellationToken ct)
    {
        if (r.Points.Count == 0) throw AppException.BadRequest("Добавьте в маршрут хотя бы одну точку");
        var (op, tariffs) = await ResolveTariffsAsync(r.OperatorId, r.VehicleType, ct);
        var points = r.Points.OrderBy(p => p.Day).ThenBy(p => p.Order)
            .Select(p => new EstimatePoint(p.Poi.Name, new GeoPoint((double)p.Poi.Latitude, (double)p.Poi.Longitude), p.Day, p.Nights,
                p.Poi.RoadType, p.Poi.EntryFee, p.Poi.LodgingPrice)).ToList();
        var result = await pricing.EstimateAsync(points, r.Participants, r.VehicleType, r.WithGuide, r.StartDate, tariffs, ct);
        var extra = r.Points.Where(p => p.Poi.NeedsPermit).Select(p => $"Для посещения «{p.Poi.Name}» нужен пропуск в пограничную зону").Distinct();
        return (result with { Warnings = result.Warnings.Concat(extra).ToList() }, op);
    }
}
