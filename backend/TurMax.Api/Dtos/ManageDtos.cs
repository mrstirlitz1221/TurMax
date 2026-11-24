using System.ComponentModel.DataAnnotations;
using TurMax.Api.Entities;

namespace TurMax.Api.Dtos;

public class PhotoInput
{
    [Required, MaxLength(1000)] public string Url { get; set; } = "";
    [MaxLength(400)] public string? Alt { get; set; }
    [MaxLength(400)] public string? Author { get; set; }
    [MaxLength(400)] public string? License { get; set; }
    [MaxLength(1000)] public string? SourceUrl { get; set; }
}

// ---------- Оператор ----------
public class OperatorProfileRequest
{
    [Required, MinLength(2), MaxLength(160)] public string Name { get; set; } = "";
    public OperatorKind Kind { get; set; }
    [MaxLength(4000)] public string Description { get; set; } = "";
    [Phone, MaxLength(30)] public string? Phone { get; set; }
    [EmailAddress, MaxLength(256)] public string? Email { get; set; }
    [Url(ErrorMessage = "Неверный адрес сайта"), MaxLength(300)] public string? Website { get; set; }
    [Range(0, 0.5, ErrorMessage = "Наценка — от 0 до 50 %")] public decimal Margin { get; set; } = 0.1m;
}

public record OperatorProfileDto(Guid Id, string Name, string Slug, OperatorKind Kind, string Description, string? Phone, string? Email,
    string? Website, decimal Margin, VerificationStatus Verification, decimal Rating, int ReviewsCount);

public class TourPointInput
{
    [Required] public Guid PoiId { get; set; }
    [Range(1, 60)] public int Day { get; set; } = 1;
    [MaxLength(400)] public string? Note { get; set; }
}

public class TourUpsertRequest
{
    [Required(ErrorMessage = "Укажите название"), MinLength(5), MaxLength(200)] public string Title { get; set; } = "";
    [Required, MinLength(10), MaxLength(1000)] public string Summary { get; set; } = "";
    [Required, MinLength(20), MaxLength(20000)] public string Description { get; set; } = "";
    [Range(1, 1000)] public int RegionId { get; set; }
    [Range(1, 1000)] public int CategoryId { get; set; }
    [Range(1, 60)] public int Days { get; set; } = 1;
    public Difficulty Difficulty { get; set; }
    [Range(1, 12)] public int SeasonFromMonth { get; set; } = 6;
    [Range(1, 12)] public int SeasonToMonth { get; set; } = 9;
    [Range(0, 9000)] public int? MaxAltitudeM { get; set; }
    [Range(0, 10000)] public decimal? DistanceKm { get; set; }
    [Range(0, 100_000_000)] public decimal PriceFrom { get; set; }
    [Required, RegularExpression("^(ru|en|ky)(,(ru|en|ky))*$", ErrorMessage = "Языки: ru, en, ky через запятую")] public string GuideLanguages { get; set; } = "ru";
    [MaxLength(4000)] public string Recommendations { get; set; } = "";
    [MaxLength(4000)] public string Includes { get; set; } = "";
    public bool NeedsPermit { get; set; }
    [MaxLength(60)] public List<TourPointInput> Points { get; set; } = new();
    [MaxLength(20)] public List<PhotoInput> Photos { get; set; } = new();
}

public record OperatorTourDto(Guid Id, string Slug, string Title, TourStatus Status, string? ModerationNote, int Days, decimal PriceFrom,
    int Views, decimal Rating, int ReviewsCount, int DeparturesCount, int BookingsCount, string? Cover, DateTime UpdatedAt);

public record TourEditDto(Guid Id, string Slug, string Title, string Summary, string Description, int RegionId, int CategoryId, int Days,
    Difficulty Difficulty, int SeasonFromMonth, int SeasonToMonth, int? MaxAltitudeM, decimal? DistanceKm, decimal PriceFrom, string GuideLanguages,
    string Recommendations, string Includes, bool NeedsPermit, TourStatus Status, string? ModerationNote,
    IReadOnlyList<TourPointInput> Points, IReadOnlyList<PhotoInput> Photos, IReadOnlyList<DepartureDto> Departures);

public class DepartureRequest
{
    [Required] public DateOnly StartDate { get; set; }
    [Range(1, 100_000_000, ErrorMessage = "Укажите цену")] public decimal Price { get; set; }
    [Range(1, 200, ErrorMessage = "Мест — от 1 до 200")] public int SeatsTotal { get; set; }
}

public class ServiceRequest
{
    public ServiceType Type { get; set; }
    public VehicleType? VehicleType { get; set; }
    [Required, MinLength(2), MaxLength(160)] public string Name { get; set; } = "";
    [Range(0.01, 10_000_000, ErrorMessage = "Укажите цену")] public decimal Price { get; set; }
    public int? RegionId { get; set; }
}

public record ServiceDto(Guid Id, ServiceType Type, VehicleType? VehicleType, string Name, decimal Price, int? RegionId);

public record OperatorStatsDto(int ToursPublished, int ToursTotal, int Views, int BookingsTotal, int BookingsNew, int BookingsConfirmed,
    int BookingsCompleted, decimal Revenue, decimal Rating, int ReviewsCount, IReadOnlyList<TourStatRow> Tours);
public record TourStatRow(string Title, int Views, int Bookings, decimal Conversion);

public record OperatorReviewDto(Guid Id, string Author, int Rating, string Text, string? OperatorReply, DateTime CreatedAt, string? TourTitle, ReviewStatus Status);

// ---------- Администратор ----------
public record AdminUserDto(Guid Id, string Email, string FullName, string Role, bool IsBlocked, DateTime CreatedAt, string? OperatorName);
public class AdminUserUpdate { public UserRole? Role { get; set; } public bool? IsBlocked { get; set; } }

public record AdminOperatorDto(Guid Id, string Name, string Slug, OperatorKind Kind, VerificationStatus Verification, string Email,
    int ToursCount, decimal Rating, bool IsDemo, DateTime CreatedAt);
public class AdminOperatorUpdate { [Required] public VerificationStatus Verification { get; set; } }

public record AdminTourDto(Guid Id, string Slug, string Title, string OperatorName, TourStatus Status, string? ModerationNote, DateTime UpdatedAt);
public class AdminTourUpdate { [Required] public TourStatus Status { get; set; } [MaxLength(1000)] public string? Note { get; set; } }

public class AdminReviewUpdate { [Required] public ReviewStatus Status { get; set; } }

public record AuditDto(long Id, DateTime CreatedAt, string? UserEmail, string Action, string EntityType, string? EntityId, string? Details, string? Ip);

public record AdminStatsDto(int Users, int Tourists, int Operators, int OperatorsPending, int ToursPublished, int ToursPending,
    int Bookings, int BookingsActive, int Reviews, int Destinations, int Pois, int Articles);

public class RegionRequest
{
    [Required, MinLength(2), MaxLength(120)] public string Name { get; set; } = "";
    [Required, RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Адрес — латиница, цифры и дефис")] public string Slug { get; set; } = "";
    [MaxLength(120)] public string? Center { get; set; }
}

public class CategoryRequest
{
    [Required, MinLength(2), MaxLength(120)] public string Name { get; set; } = "";
    [Required, RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Адрес — латиница, цифры и дефис")] public string Slug { get; set; } = "";
    [Required, MaxLength(200)] public string Tagline { get; set; } = "";
    [Required, MaxLength(4000)] public string Description { get; set; } = "";
    [MaxLength(1000)] public string? ImageUrl { get; set; }
    [MaxLength(400)] public string? ImageCredit { get; set; }
    public int SortOrder { get; set; }
}

public class DestinationRequest
{
    [Required, MinLength(2), MaxLength(160)] public string Name { get; set; } = "";
    [RegularExpression("^[a-z0-9-]*$", ErrorMessage = "Адрес — латиница, цифры и дефис")] public string? Slug { get; set; }
    [Required, MaxLength(200)] public string Tagline { get; set; } = "";
    [Required, MaxLength(1000)] public string Summary { get; set; } = "";
    [Required, MaxLength(20000)] public string Description { get; set; } = "";
    [Range(1, 1000)] public int RegionId { get; set; }
    [Range(39, 44, ErrorMessage = "Широта вне Кыргызстана")] public decimal Latitude { get; set; }
    [Range(69, 81, ErrorMessage = "Долгота вне Кыргызстана")] public decimal Longitude { get; set; }
    [MaxLength(400)] public string? BestTime { get; set; }
    [MaxLength(4000)] public string Highlights { get; set; } = "";
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public List<int> CategoryIds { get; set; } = new();
    [MaxLength(30)] public List<PhotoInput> Photos { get; set; } = new();
}

public record DestinationEditDto(Guid Id, string Slug, string Name, string Tagline, string Summary, string Description, int RegionId,
    decimal Latitude, decimal Longitude, string? BestTime, string Highlights, bool IsFeatured, int SortOrder, IReadOnlyList<int> CategoryIds,
    IReadOnlyList<PhotoInput> Photos);

public class PoiRequest
{
    [Required, MinLength(2), MaxLength(160)] public string Name { get; set; } = "";
    [RegularExpression("^[a-z0-9-]*$", ErrorMessage = "Адрес — латиница, цифры и дефис")] public string? Slug { get; set; }
    public PoiKind Kind { get; set; }
    [Required, MaxLength(1000)] public string Summary { get; set; } = "";
    [MaxLength(20000)] public string Description { get; set; } = "";
    [Range(1, 1000)] public int RegionId { get; set; }
    public Guid? DestinationId { get; set; }
    [Range(39, 44, ErrorMessage = "Широта вне Кыргызстана")] public decimal Latitude { get; set; }
    [Range(69, 81, ErrorMessage = "Долгота вне Кыргызстана")] public decimal Longitude { get; set; }
    [Range(0, 8000)] public int? AltitudeM { get; set; }
    public RoadType RoadType { get; set; }
    [Range(0, 1_000_000)] public decimal? EntryFee { get; set; }
    [Range(0, 1_000_000)] public decimal? LodgingPrice { get; set; }
    public bool NeedsPermit { get; set; }
    [MaxLength(200)] public string? Season { get; set; }
    public bool IsPublished { get; set; } = true;
    [MaxLength(30)] public List<PhotoInput> Photos { get; set; } = new();
}

public record PoiEditDto(Guid Id, string Slug, string Name, PoiKind Kind, string Summary, string Description, int RegionId, Guid? DestinationId,
    decimal Latitude, decimal Longitude, int? AltitudeM, RoadType RoadType, decimal? EntryFee, decimal? LodgingPrice, bool NeedsPermit,
    string? Season, bool IsPublished, IReadOnlyList<PhotoInput> Photos);

public class ArticleRequest
{
    [Required, MinLength(5), MaxLength(200)] public string Title { get; set; } = "";
    [RegularExpression("^[a-z0-9-]*$", ErrorMessage = "Адрес — латиница, цифры и дефис")] public string? Slug { get; set; }
    [Required, MaxLength(1000)] public string Lead { get; set; } = "";
    [Required, MinLength(50), MaxLength(50000)] public string Body { get; set; } = "";
    [Required, MaxLength(80)] public string Topic { get; set; } = "";
    [MaxLength(120)] public string AuthorName { get; set; } = "Редакция TurMax";
    [Range(1, 120)] public int ReadingMinutes { get; set; } = 5;
    public bool IsPublished { get; set; } = true;
    public Guid? DestinationId { get; set; }
    [MaxLength(20)] public List<PhotoInput> Photos { get; set; } = new();
}

public record ArticleEditDto(Guid Id, string Slug, string Title, string Lead, string Body, string Topic, string AuthorName, int ReadingMinutes,
    bool IsPublished, DateTime PublishedAt, Guid? DestinationId, IReadOnlyList<PhotoInput> Photos);

public record AdminListItem(Guid Id, string Slug, string Name, string? Extra, bool Published);
