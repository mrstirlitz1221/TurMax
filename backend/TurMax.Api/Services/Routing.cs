using System.Globalization;
using System.Text.Json;
using TurMax.Api.Entities;

namespace TurMax.Api.Services;

public record GeoPoint(double Lat, double Lng);

/// <summary>Отрезок маршрута между двумя соседними точками.</summary>
public record RouteLeg(double DistanceKm, double? DurationHours);

/// <summary>Результат построения маршрута: отрезки, линия для карты и признак приблизительной оценки.</summary>
public record RoutingResult(IReadOnlyList<RouteLeg> Legs, IReadOnlyList<GeoPoint> Geometry, bool Approximate);

/// <summary>Стратегия получения расстояний (рис. 2.4: IRoutingProvider).</summary>
public interface IRoutingProvider
{
    Task<RoutingResult?> RouteAsync(IReadOnlyList<GeoPoint> points, CancellationToken ct);
}

/// <summary>Резервная оценка: расстояние по большому кругу × 1,3 (п. 2.2). Замена PostGIS ST_Distance.</summary>
public class HaversineRoutingProvider : IRoutingProvider
{
    public const double DetourFactor = 1.3;

    public static double DistanceKm(GeoPoint a, GeoPoint b)
    {
        const double R = 6371.0088;
        double Rad(double d) => d * Math.PI / 180;
        var dLat = Rad(b.Lat - a.Lat);
        var dLng = Rad(b.Lng - a.Lng);
        var h = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(a.Lat)) * Math.Cos(Rad(b.Lat)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return 2 * R * Math.Asin(Math.Sqrt(h));
    }

    public Task<RoutingResult?> RouteAsync(IReadOnlyList<GeoPoint> points, CancellationToken ct)
    {
        var legs = new List<RouteLeg>();
        for (var i = 1; i < points.Count; i++)
            legs.Add(new RouteLeg(DistanceKm(points[i - 1], points[i]) * DetourFactor, null));
        return Task.FromResult<RoutingResult?>(new RoutingResult(legs, points, true));
    }
}

/// <summary>OSRM — маршрутизатор на данных OpenStreetMap (п. 2.2). Адрес задаётся в Routing:OsrmBaseUrl.</summary>
public class OsrmRoutingProvider(HttpClient http, ILogger<OsrmRoutingProvider> log) : IRoutingProvider
{
    public async Task<RoutingResult?> RouteAsync(IReadOnlyList<GeoPoint> points, CancellationToken ct)
    {
        if (http.BaseAddress is null || points.Count < 2) return null;
        var coords = string.Join(';', points.Select(p => string.Create(CultureInfo.InvariantCulture, $"{p.Lng:0.######},{p.Lat:0.######}")));
        try
        {
            using var resp = await http.GetAsync($"route/v1/driving/{coords}?overview=simplified&geometries=geojson&steps=false", ct);
            if (!resp.IsSuccessStatusCode) return null;
            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = doc.RootElement;
            if (root.GetProperty("code").GetString() != "Ok") return null;
            var route = root.GetProperty("routes")[0];
            var legs = route.GetProperty("legs").EnumerateArray()
                .Select(l => new RouteLeg(l.GetProperty("distance").GetDouble() / 1000, l.GetProperty("duration").GetDouble() / 3600))
                .ToList();
            var geometry = route.GetProperty("geometry").GetProperty("coordinates").EnumerateArray()
                .Select(c => new GeoPoint(c[1].GetDouble(), c[0].GetDouble())).ToList();
            // OSRM может «дотянуть» точку до ближайшей дороги на большом расстоянии — такие ответы не используем.
            if (legs.Count != points.Count - 1) return null;
            return new RoutingResult(legs, geometry, false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or KeyNotFoundException or InvalidOperationException)
        {
            log.LogWarning("OSRM недоступен, используется резервная оценка: {Message}", ex.Message);
            return null;
        }
    }
}

/// <summary>Сервис маршрутизации: сначала OSRM, при сбое — резервная оценка.</summary>
public class RoutingService(OsrmRoutingProvider osrm, HaversineRoutingProvider fallback)
{
    public async Task<RoutingResult> RouteAsync(IReadOnlyList<GeoPoint> points, CancellationToken ct)
    {
        if (points.Count < 2) return new RoutingResult([], points, false);
        return await osrm.RouteAsync(points, ct) ?? (await fallback.RouteAsync(points, ct))!;
    }

    public static double RoadFactor(RoadType t) => t switch { RoadType.Gravel => 1.3, RoadType.Dirt => 1.6, _ => 1.0 };
    public static double AvgSpeed(RoadType t) => t switch { RoadType.Gravel => 40, RoadType.Dirt => 25, _ => 70 };
}
