using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Tests;

public class PricingTests
{
    static readonly Tariffs DiplomaTariffs = new(TransportPerKm: 30, LodgingPerNight: 1500, MealsPerDay: 1200, GuidePerDay: 3000, Margin: 0.12m);

    /// <summary>
    /// Контрольный пример из табл. 2.7 диплома: Бишкек — Чолпон-Ата — Каракол — Джеты-Огуз — Бишкек,
    /// 3 дня, 4 участника, минивэн, отрезки 250 + 150 + 28 (гравий) + 430 км, сборы 150 сом, июль.
    /// Ожидается: транспорт 25 992, проживание 12 000, питание 14 400, гид 9 000, сборы 600, итого 76 374, на человека 19 094.
    /// </summary>
    [Fact]
    public void Diploma_control_example_matches_table_2_7()
    {
        var p = new List<EstimatePoint>
        {
            new("Бишкек", new(42.87, 74.59), 1, 0, RoadType.Asphalt, null, null),
            new("Чолпон-Ата", new(42.65, 77.08), 1, 1, RoadType.Asphalt, null, 1500),
            new("Каракол", new(42.49, 78.39), 2, 1, RoadType.Asphalt, null, 1500),
            new("Джеты-Огуз", new(42.33, 78.24), 3, 0, RoadType.Gravel, 150, null),
            new("Бишкек ", new(42.87, 74.59), 3, 0, RoadType.Asphalt, null, null),
        };
        var route = new RoutingResult([new(250, null), new(150, null), new(28, null), new(430, null)], [], Approximate: false);

        var r = PricingService.Calculate(p, route, 4, VehicleType.Minivan, withGuide: true, new DateOnly(2027, 7, 10), DiplomaTariffs);

        Assert.Equal(858, r.DistanceKm);
        Assert.Equal(866.4, r.WeightedDistanceKm);
        Assert.Equal(1, r.Vehicles);
        Assert.Equal(25992m, r.Items.Transport);
        Assert.Equal(12000m, r.Items.Lodging);
        Assert.Equal(14400m, r.Items.Meals);
        Assert.Equal(9000m, r.Items.Guide);
        Assert.Equal(600m, r.Items.Fees);
        Assert.Equal(61992m, r.Subtotal);
        Assert.Equal(1.10m, r.SeasonFactor);
        Assert.Equal(76374m, r.Total);
        Assert.Equal(19094m, r.PerPerson);
        Assert.False(r.Approximate);
    }

    [Theory]
    [InlineData(3, VehicleType.Sedan, 1)]
    [InlineData(4, VehicleType.Sedan, 2)]
    [InlineData(7, VehicleType.Minivan, 1)]
    [InlineData(8, VehicleType.Minivan, 2)]
    [InlineData(19, VehicleType.Bus, 2)]
    public void Vehicle_count_is_ceil_of_participants_over_capacity(int n, VehicleType v, int expected)
    {
        var p = new List<EstimatePoint> { new("A", new(42, 74), 1, 0, RoadType.Asphalt, null, null), new("B", new(42.1, 74.1), 1, 0, RoadType.Asphalt, null, null) };
        var r = PricingService.Calculate(p, new([new(10, null)], [], false), n, v, false, null, DiplomaTariffs);
        Assert.Equal(expected, r.Vehicles);
    }

    [Theory]
    [InlineData(1, 0.90)]
    [InlineData(5, 1.00)]
    [InlineData(8, 1.10)]
    [InlineData(12, 0.90)]
    public void Season_factor_by_month(int month, decimal expected) =>
        Assert.Equal(expected, PricingService.SeasonFactor(new DateOnly(2027, month, 1)));

    [Fact]
    public void Long_driving_day_produces_warning_and_fallback_speed_is_used()
    {
        var p = new List<EstimatePoint>
        {
            new("A", new(42, 74), 1, 0, RoadType.Asphalt, null, null),
            new("B", new(41, 75), 1, 0, RoadType.Dirt, null, null),
        };
        // 250 км по грунтовке при 25 км/ч = 10 ч > 8 ч.
        var r = PricingService.Calculate(p, new([new(250, null)], [], true), 2, VehicleType.Sedan, false, null, DiplomaTariffs);
        Assert.Equal(10.0, r.DrivingHoursByDay[0]);
        Assert.Contains(r.Warnings, w => w.Contains("более 8 часов"));
        Assert.Contains(r.Warnings, w => w.Contains("приблизительно"));
    }

    [Fact]
    public void Haversine_fallback_multiplies_by_1_3()
    {
        var a = new GeoPoint(42.866667, 74.566667); // Бишкек
        var b = new GeoPoint(42.490556, 78.393611); // Каракол
        var straight = HaversineRoutingProvider.DistanceKm(a, b);
        Assert.InRange(straight, 300, 330);
        var leg = new HaversineRoutingProvider().RouteAsync([a, b], default).Result!.Legs[0];
        Assert.Equal(straight * 1.3, leg.DistanceKm, 6);
    }
}

public class BookingStateMachineTests
{
    static Booking New() => new() { Status = BookingStatus.New };

    [Fact]
    public void Happy_path_new_review_confirm_complete_writes_history()
    {
        var b = New();
        BookingStateMachine.Move(b, BookingStatus.InReview, null);
        BookingStateMachine.Move(b, BookingStatus.Confirmed, null);
        BookingStateMachine.Move(b, BookingStatus.Completed, null);
        Assert.Equal(BookingStatus.Completed, b.Status);
        Assert.Equal(3, b.History.Count);
        Assert.Equal(BookingStatus.Confirmed, b.History[2].FromStatus);
    }

    [Fact]
    public void Price_change_waits_for_tourist_then_confirms()
    {
        var b = New();
        BookingStateMachine.Move(b, BookingStatus.InReview, null);
        BookingStateMachine.Move(b, BookingStatus.PriceChanged, null);
        BookingStateMachine.Move(b, BookingStatus.Confirmed, null);
        Assert.Equal(BookingStatus.Confirmed, b.Status);
    }

    [Theory]
    [InlineData(BookingStatus.Cancelled, BookingStatus.Confirmed)]
    [InlineData(BookingStatus.Rejected, BookingStatus.Confirmed)]
    [InlineData(BookingStatus.New, BookingStatus.Completed)]
    [InlineData(BookingStatus.Completed, BookingStatus.Cancelled)]
    public void Forbidden_transitions_throw_409(BookingStatus from, BookingStatus to)
    {
        var b = new Booking { Status = from };
        var ex = Assert.Throws<AppException>(() => BookingStateMachine.Move(b, to, null));
        Assert.Equal(409, ex.StatusCode);
        Assert.Empty(b.History);
    }
}
