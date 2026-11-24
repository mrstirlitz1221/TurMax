using TurMax.Api.Entities;

namespace TurMax.Api.Services;

/// <summary>Точка маршрута для расчёта сметы.</summary>
public record EstimatePoint(string Name, GeoPoint Location, int Day, int Nights, RoadType RoadType, decimal? EntryFee, decimal? LodgingPrice);

/// <summary>Тарифы оператора (таблица services).</summary>
public record Tariffs(decimal? TransportPerKm, decimal? LodgingPerNight, decimal? MealsPerDay, decimal? GuidePerDay, decimal Margin);

public record EstimateItems(decimal Transport, decimal Lodging, decimal Meals, decimal Guide, decimal Fees);

public record EstimateResult(
    int Participants,
    int Days,
    double DistanceKm,
    double WeightedDistanceKm,
    int Vehicles,
    IReadOnlyList<double> DrivingHoursByDay,
    EstimateItems Items,
    decimal Subtotal,
    decimal SeasonFactor,
    decimal OperatorMargin,
    decimal Total,
    decimal PerPerson,
    string Currency,
    bool Approximate,
    IReadOnlyList<string> Warnings,
    IReadOnlyList<GeoPoint> Geometry);

/// <summary>
/// Расчёт сметы маршрута по п. 2.6 диплома:
/// C = (C_тр + C_прож + C_пит + C_гид + C_сб) · k_сез · (1 + m_оп), m = ⌈n / cap⌉.
/// </summary>
public class PricingService(RoutingService routing)
{
    public static int Capacity(VehicleType v) => v switch { VehicleType.Sedan => 3, VehicleType.Minivan => 7, _ => 18 };

    /// <summary>Сезонный коэффициент: 1,1 — июль и август, 0,9 — низкий сезон (ноябрь–март), 1,0 — межсезонье.</summary>
    public static decimal SeasonFactor(DateOnly? start) => start?.Month switch
    {
        7 or 8 => 1.10m,
        11 or 12 or 1 or 2 or 3 => 0.90m,
        _ => 1.00m
    };

    public async Task<EstimateResult> EstimateAsync(IReadOnlyList<EstimatePoint> points, int participants, VehicleType vehicle,
        bool withGuide, DateOnly? startDate, Tariffs tariffs, CancellationToken ct)
    {
        var route = await routing.RouteAsync(points.Select(p => p.Location).ToList(), ct);
        return Calculate(points, route, participants, vehicle, withGuide, startDate, tariffs);
    }

    /// <summary>Чистая функция расчёта — покрыта модульными тестами (контрольный пример табл. 2.7).</summary>
    public static EstimateResult Calculate(IReadOnlyList<EstimatePoint> points, RoutingResult route, int participants,
        VehicleType vehicle, bool withGuide, DateOnly? startDate, Tariffs t)
    {
        if (participants is < 1 or > 50) throw new ArgumentOutOfRangeException(nameof(participants));
        var warnings = new List<string>();
        var n = participants;
        var days = points.Count == 0 ? 0 : points.Max(p => p.Day);
        var vehicles = (int)Math.Ceiling(n / (double)Capacity(vehicle));

        // Транспорт: r · m · Σ d_i · k_i. Коэффициент отрезка — по типу дороги к точке назначения.
        double distance = 0, weighted = 0;
        var hoursByDay = new double[Math.Max(days, 1)];
        for (var i = 0; i < route.Legs.Count && i + 1 < points.Count; i++)
        {
            var leg = route.Legs[i];
            var to = points[i + 1];
            distance += leg.DistanceKm;
            weighted += leg.DistanceKm * RoutingService.RoadFactor(to.RoadType);
            var hours = leg.DurationHours ?? leg.DistanceKm / RoutingService.AvgSpeed(to.RoadType);
            hoursByDay[Math.Clamp(to.Day, 1, hoursByDay.Length) - 1] += hours;
        }

        decimal transport = 0;
        if (route.Legs.Count > 0)
        {
            if (t.TransportPerKm is { } r) transport = r * vehicles * (decimal)Math.Round(weighted, 1);
            else warnings.Add("У выбранного оператора нет тарифа на этот тип транспорта — транспорт не учтён в смете");
        }

        // Проживание: Σ по ночам p_н · n (цена ночлега в точке, иначе тариф оператора).
        decimal lodging = 0;
        foreach (var p in points.Where(p => p.Nights > 0))
        {
            var price = p.LodgingPrice ?? t.LodgingPerNight;
            if (price is null) { warnings.Add($"Нет цены ночлега в точке «{p.Name}»"); continue; }
            lodging += price.Value * p.Nights * n;
        }

        // Питание: D · n · p_пит; гид: D · p_гид.
        var meals = days * n * (t.MealsPerDay ?? 0);
        if (t.MealsPerDay is null && days > 0) warnings.Add("У оператора нет тарифа на питание");
        decimal guide = 0;
        if (withGuide)
        {
            if (t.GuidePerDay is { } g) guide = days * g;
            else warnings.Add("Оператор не предоставляет услуги гида");
        }

        // Сборы и билеты: n · Σ f_j (каждая точка учитывается один раз).
        var fees = n * points.GroupBy(p => p.Name).Sum(g => g.First().EntryFee ?? 0);

        var subtotal = transport + lodging + meals + guide + fees;
        var k = SeasonFactor(startDate);
        var total = Math.Round(subtotal * k * (1 + t.Margin), 0, MidpointRounding.AwayFromZero);
        var perPerson = Math.Ceiling(total / n);

        for (var d = 0; d < hoursByDay.Length; d++)
            if (hoursByDay[d] > 8) warnings.Add($"День {d + 1}: более 8 часов в пути ({hoursByDay[d]:0.0} ч) — рекомендуем добавить ночёвку");
        if (route.Approximate && route.Legs.Count > 0)
            warnings.Add("Расстояния оценены приблизительно (по прямой × 1,3) — сервис маршрутизации недоступен");

        return new EstimateResult(n, days, Math.Round(distance), Math.Round(weighted, 1), vehicles,
            hoursByDay.Select(h => Math.Round(h, 1)).ToList(),
            new EstimateItems(transport, lodging, meals, guide, fees),
            subtotal, k, t.Margin, total, perPerson, "KGS", route.Approximate, warnings, route.Geometry);
    }
}
