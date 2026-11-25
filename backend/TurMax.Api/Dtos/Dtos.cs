using System.ComponentModel.DataAnnotations;
using TurMax.Api.Entities;

namespace TurMax.Api.Dtos;

// ---------- Общие ----------
public record PhotoDto(string Url, string Alt, string? Author, string? License, string? SourceUrl);
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
public record RegionDto(int Id, string Name, string Slug, string? Center);
public record CategoryDto(int Id, string Name, string Slug, string Tagline, string Description, string? ImageUrl, string? ImageCredit, int ToursCount, int DestinationsCount);

// ---------- Направления и точки ----------
public record DestinationCardDto(Guid Id, string Slug, string Name, string Tagline, string Summary, string Region, decimal Latitude, decimal Longitude,
    PhotoDto? Cover, IReadOnlyList<string> Categories);

public record PoiCardDto(Guid Id, string Slug, string Name, PoiKind Kind, string Summary, string Region, decimal Latitude, decimal Longitude,
    int? AltitudeM, PhotoDto? Cover, string? DestinationSlug);

public record DestinationDto(Guid Id, string Slug, string Name, string Tagline, string Summary, string Description, RegionDto Region,
    decimal Latitude, decimal Longitude, string? BestTime, IReadOnlyList<string> Highlights, IReadOnlyList<CategoryDto> Categories,
    IReadOnlyList<PhotoDto> Photos, IReadOnlyList<PoiCardDto> Attractions, IReadOnlyList<PoiCardDto> Nearby,
    IReadOnlyList<TourCardDto> Tours, IReadOnlyList<ArticleCardDto> Articles, bool Untranslated = false);

public record PoiDto(Guid Id, string Slug, string Name, PoiKind Kind, string Summary, string Description, RegionDto Region,
    decimal Latitude, decimal Longitude, int? AltitudeM, RoadType RoadType, decimal? EntryFee, decimal? LodgingPrice, bool NeedsPermit,
    string? Season, IReadOnlyList<PhotoDto> Photos, DestinationCardDto? Destination, IReadOnlyList<PoiCardDto> Nearby, IReadOnlyList<TourCardDto> Tours,
    bool Untranslated = false);

public record MapPointDto(Guid Id, string Slug, string Name, string Type, PoiKind? Kind, string Summary, decimal Latitude, decimal Longitude, string? ImageUrl, string Url);

// ---------- Туры ----------
public record TourCardDto(Guid Id, string Slug, string Title, string Summary, string Region, string Category, string CategorySlug, int Days,
    Difficulty Difficulty, int SeasonFromMonth, int SeasonToMonth, decimal PriceFrom, decimal Rating, int ReviewsCount,
    string OperatorName, PhotoDto? Cover, int? MaxAltitudeM, decimal? DistanceKm, string GuideLanguages,
    decimal? KeyLatitude = null, decimal? KeyLongitude = null);

public record TourPointDto(Guid PoiId, string PoiSlug, string Name, PoiKind Kind, int Day, int Order, string? Note, decimal Latitude, decimal Longitude, int? AltitudeM);
public record DepartureDto(Guid Id, DateOnly StartDate, decimal Price, int SeatsTotal, int SeatsAvailable);
public record OperatorPublicDto(Guid Id, string Name, string Slug, OperatorKind Kind, string Description, decimal Rating, int ReviewsCount, bool Verified, bool IsDemo);
public record ReviewDto(Guid Id, string Author, int Rating, string Text, string? OperatorReply, DateTime CreatedAt, string? TourTitle);

public record TourDto(Guid Id, string Slug, string Title, string Summary, string Description, RegionDto Region, CategoryDto Category,
    int Days, Difficulty Difficulty, int SeasonFromMonth, int SeasonToMonth, int? MaxAltitudeM, decimal? DistanceKm, decimal PriceFrom,
    IReadOnlyList<string> GuideLanguages, IReadOnlyList<string> Recommendations, IReadOnlyList<string> Includes, bool NeedsPermit,
    decimal Rating, int ReviewsCount, IReadOnlyList<PhotoDto> Photos, IReadOnlyList<TourPointDto> Points,
    IReadOnlyList<DepartureDto> Departures, OperatorPublicDto Operator, IReadOnlyList<ReviewDto> Reviews, TourStatus Status,
    bool Untranslated = false);

public class TourQuery
{
    public string? Q { get; set; }
    public string? Region { get; set; }
    public string? Category { get; set; }
    public int? DaysMin { get; set; }
    public int? DaysMax { get; set; }
    public Difficulty? Difficulty { get; set; }
    /// <summary>Месяц поездки (1–12) — фильтр по сезону.</summary>
    [Range(1, 12)] public int? Month { get; set; }
    public decimal? PriceMax { get; set; }
    /// <summary>Язык гида: ru, en, ky.</summary>
    public string? Lang { get; set; }
    public string? Destination { get; set; }
    /// <summary>popular | price | priceDesc | days | rating | new</summary>
    public string? Sort { get; set; }
    [Range(1, 1000)] public int Page { get; set; } = 1;
    [Range(1, 48)] public int PageSize { get; set; } = 12;
}

// ---------- Статьи ----------
public record ArticleCardDto(Guid Id, string Slug, string Title, string Lead, string Topic, int ReadingMinutes, DateTime PublishedAt, PhotoDto? Cover);
public record ArticleDto(Guid Id, string Slug, string Title, string Lead, string Body, string Topic, string AuthorName, int ReadingMinutes,
    DateTime PublishedAt, IReadOnlyList<PhotoDto> Photos, DestinationCardDto? Destination, IReadOnlyList<ArticleCardDto> Related,
    bool Untranslated = false);

public record SearchResultDto(IReadOnlyList<DestinationCardDto> Destinations, IReadOnlyList<PoiCardDto> Attractions,
    IReadOnlyList<TourCardDto> Tours, IReadOnlyList<ArticleCardDto> Articles);

// ---------- Аутентификация ----------
public class RegisterRequest
{
    [Required(ErrorMessage = "Укажите e-mail"), EmailAddress(ErrorMessage = "Неверный формат e-mail"), MaxLength(256)]
    public string Email { get; set; } = "";
    [Required(ErrorMessage = "Укажите пароль"), MinLength(8, ErrorMessage = "Пароль — не короче 8 символов"), MaxLength(128)]
    public string Password { get; set; } = "";
    [Required(ErrorMessage = "Укажите имя"), MinLength(2, ErrorMessage = "Имя слишком короткое"), MaxLength(120)]
    public string FullName { get; set; } = "";
    [Phone(ErrorMessage = "Неверный формат телефона"), MaxLength(30)]
    public string? Phone { get; set; }
    /// <summary>tourist | operator</summary>
    [RegularExpression("^(tourist|operator)$", ErrorMessage = "Неизвестный тип аккаунта")]
    public string AccountType { get; set; } = "tourist";
    [MaxLength(160)] public string? CompanyName { get; set; }
    public OperatorKind? OperatorKind { get; set; }
    /// <summary>Согласие на обработку персональных данных (п. 2.9).</summary>
    [Range(typeof(bool), "true", "true", ErrorMessage = "Необходимо согласие на обработку персональных данных")]
    public bool Consent { get; set; }
}

public class LoginRequest
{
    [Required(ErrorMessage = "Укажите e-mail"), EmailAddress(ErrorMessage = "Неверный формат e-mail")] public string Email { get; set; } = "";
    [Required(ErrorMessage = "Укажите пароль")] public string Password { get; set; } = "";
}

public class UpdateProfileRequest
{
    [Required, MinLength(2), MaxLength(120)] public string FullName { get; set; } = "";
    [Phone(ErrorMessage = "Неверный формат телефона"), MaxLength(30)] public string? Phone { get; set; }
}

public class ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; set; } = "";
    [Required, MinLength(8, ErrorMessage = "Пароль — не короче 8 символов"), MaxLength(128)] public string NewPassword { get; set; } = "";
}

public record UserDto(Guid Id, string Email, string FullName, string? Phone, string Role, Guid? OperatorId, string? OperatorName, VerificationStatus? OperatorStatus, string Language = "ru");
public record AuthResponse(string AccessToken, DateTime ExpiresAt, UserDto User);

// ---------- Конструктор маршрута ----------
public class RouteUpsertRequest
{
    [Required(ErrorMessage = "Укажите название"), MaxLength(160)] public string Title { get; set; } = "Мой маршрут";
    [Range(1, 50, ErrorMessage = "Участников — от 1 до 50")] public int Participants { get; set; } = 2;
    public DateOnly? StartDate { get; set; }
    public VehicleType VehicleType { get; set; } = VehicleType.Minivan;
    public bool WithGuide { get; set; } = true;
    public Guid? OperatorId { get; set; }
}

public class RoutePointInput
{
    [Required] public Guid PoiId { get; set; }
    [Range(1, 60)] public int Day { get; set; }
    [Range(0, 30)] public int Nights { get; set; }
}

public class RoutePointsRequest
{
    [MaxLength(60, ErrorMessage = "Не более 60 точек")] public List<RoutePointInput> Points { get; set; } = new();
}

public record RoutePointDto(Guid Id, Guid PoiId, string PoiSlug, string Name, PoiKind Kind, int Day, int Order, int Nights,
    decimal Latitude, decimal Longitude, RoadType RoadType, decimal? EntryFee, decimal? LodgingPrice, bool NeedsPermit);

public record RouteDto(Guid Id, string Title, int Participants, DateOnly? StartDate, VehicleType VehicleType, bool WithGuide,
    Guid? OperatorId, string? OperatorName, DateTime UpdatedAt, IReadOnlyList<RoutePointDto> Points);

public record RouteSummaryDto(Guid Id, string Title, int Participants, int Days, int PointsCount, DateTime UpdatedAt, string? Cover);

public record ProviderDto(Guid Id, string Name, string Slug, OperatorKind Kind, decimal Rating, decimal Margin, bool IsDemo,
    IReadOnlyList<VehicleType> Vehicles, bool HasGuide);

// ---------- Избранное ----------
public class FavoriteRequest { public Guid? TourId { get; set; } public Guid? DestinationId { get; set; } }
public record FavoriteDto(Guid Id, TourCardDto? Tour, DestinationCardDto? Destination, DateTime CreatedAt);

// ---------- Заявки ----------
public class CreateBookingRequest
{
    public Guid? DepartureId { get; set; }
    public Guid? RouteId { get; set; }
    [Range(1, 50, ErrorMessage = "Участников — от 1 до 50")] public int Participants { get; set; } = 1;
    /// <summary>Дата начала — обязательна для собственного маршрута.</summary>
    public DateOnly? StartDate { get; set; }
    [Required(ErrorMessage = "Укажите контактный телефон"), Phone(ErrorMessage = "Неверный формат телефона"), MaxLength(30)]
    public string ContactPhone { get; set; } = "";
    [MaxLength(2000)] public string? Comment { get; set; }
}

public record BookingHistoryDto(BookingStatus? FromStatus, BookingStatus ToStatus, string? By, string? Note, DateTime CreatedAt);

public record BookingDto(Guid Id, BookingStatus Status, string Title, string? TourSlug, Guid? RouteId, Guid? DepartureId,
    int Participants, DateOnly StartDate, DateOnly EndDate, decimal PriceCalc, decimal? PriceFinal, string? Comment,
    string? OperatorNote, string OperatorName, string? TouristName, string? TouristEmail, string? ContactPhone,
    DateTime CreatedAt, DateTime UpdatedAt, bool CanReview, bool HasReview, IReadOnlyList<BookingHistoryDto> History);

public class OperatorBookingAction
{
    /// <summary>confirm | reject | changePrice</summary>
    [Required, RegularExpression("^(confirm|reject|changePrice)$", ErrorMessage = "Неизвестное действие")]
    public string Action { get; set; } = "";
    [Range(1, 100_000_000)] public decimal? Price { get; set; }
    [MaxLength(2000)] public string? Note { get; set; }
}

public class ReviewRequest
{
    [Range(1, 5, ErrorMessage = "Оценка — от 1 до 5")] public int Rating { get; set; }
    [Required(ErrorMessage = "Напишите отзыв"), MinLength(10, ErrorMessage = "Отзыв — не короче 10 символов"), MaxLength(3000)]
    public string Text { get; set; } = "";
}

public class ReplyRequest { [Required, MinLength(2), MaxLength(2000)] public string Text { get; set; } = ""; }

public record NotificationDto(Guid Id, string Title, string Body, string? Link, bool IsRead, DateTime CreatedAt);
