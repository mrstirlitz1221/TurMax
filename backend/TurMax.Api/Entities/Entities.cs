namespace TurMax.Api.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Tourist;
    public bool IsBlocked { get; set; }
    public string Language { get; set; } = "ru";
    public DateTime ConsentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Operator? Operator { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    /// <summary>SHA-256 хеш токена; сам токен в БД не хранится.</summary>
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Operator
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public OperatorKind Kind { get; set; }
    public string Description { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public VerificationStatus Verification { get; set; } = VerificationStatus.Pending;
    /// <summary>Наценка оператора m_оп (доля, например 0.12).</summary>
    public decimal Margin { get; set; } = 0.10m;
    public decimal Rating { get; set; }
    public int ReviewsCount { get; set; }
    public bool IsDemo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<Tour> Tours { get; set; } = new();
    public List<Service> Services { get; set; } = new();
}

public class Region
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Center { get; set; }
}

/// <summary>Категория путешествий (= «тип тура» из FR-01).</summary>
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Tagline { get; set; } = "";
    public string Description { get; set; } = "";
    public string? ImageUrl { get; set; }
    public string? ImageCredit { get; set; }
    public int SortOrder { get; set; }
    public List<Destination> Destinations { get; set; } = new();
}

public class Destination
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Tagline { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Description { get; set; } = "";
    public int RegionId { get; set; }
    public Region Region { get; set; } = null!;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string? BestTime { get; set; }
    /// <summary>Особенности, по одной на строку.</summary>
    public string Highlights { get; set; } = "";
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public List<Category> Categories { get; set; } = new();
    public List<Photo> Photos { get; set; } = new();
    public List<Poi> Pois { get; set; } = new();
}

/// <summary>Точка интереса / достопримечательность (таблица poi).</summary>
public class Poi
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public PoiKind Kind { get; set; }
    public string Summary { get; set; } = "";
    public string Description { get; set; } = "";
    public int RegionId { get; set; }
    public Region Region { get; set; } = null!;
    public Guid? DestinationId { get; set; }
    public Destination? Destination { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public int? AltitudeM { get; set; }
    public RoadType RoadType { get; set; }
    /// <summary>Входной билет / экосбор с человека, сом (f_j).</summary>
    public decimal? EntryFee { get; set; }
    /// <summary>Цена ночлега за человека, сом (p_н); null — ночёвка не предусмотрена.</summary>
    public decimal? LodgingPrice { get; set; }
    public bool NeedsPermit { get; set; }
    public string? Season { get; set; }
    public bool IsPublished { get; set; } = true;
    public List<Photo> Photos { get; set; } = new();
}

public class Tour
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = "";
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    public int RegionId { get; set; }
    public Region Region { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Description { get; set; } = "";
    public int Days { get; set; }
    public Difficulty Difficulty { get; set; }
    public int SeasonFromMonth { get; set; } = 6;
    public int SeasonToMonth { get; set; } = 9;
    public int? MaxAltitudeM { get; set; }
    public decimal? DistanceKm { get; set; }
    public decimal PriceFrom { get; set; }
    /// <summary>Языки гида через запятую: ru,en,ky.</summary>
    public string GuideLanguages { get; set; } = "ru";
    public string Recommendations { get; set; } = "";
    public string Includes { get; set; } = "";
    public bool NeedsPermit { get; set; }
    public TourStatus Status { get; set; } = TourStatus.Draft;
    public string? ModerationNote { get; set; }
    public decimal Rating { get; set; }
    public int ReviewsCount { get; set; }
    public int Views { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<TourPoint> Points { get; set; } = new();
    public List<Departure> Departures { get; set; } = new();
    public List<Photo> Photos { get; set; } = new();
}

public class TourPoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TourId { get; set; }
    public Tour Tour { get; set; } = null!;
    public Guid PoiId { get; set; }
    public Poi Poi { get; set; } = null!;
    public int Day { get; set; }
    public int Order { get; set; }
    public string? Note { get; set; }
}

public class Departure
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TourId { get; set; }
    public Tour Tour { get; set; } = null!;
    public DateOnly StartDate { get; set; }
    /// <summary>Цена за человека, сом.</summary>
    public decimal Price { get; set; }
    public int SeatsTotal { get; set; }
    public int SeatsAvailable { get; set; }
}

/// <summary>Тариф оператора (таблица services).</summary>
public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    public int? RegionId { get; set; }
    public Region? Region { get; set; }
    public ServiceType Type { get; set; }
    public VehicleType? VehicleType { get; set; }
    public string Name { get; set; } = "";
    /// <summary>Transport — сом/км; Lodging — сом/чел/ночь; Meals — сом/чел/день; Guide — сом/день.</summary>
    public decimal Price { get; set; }
}

public class UserRoute
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = "";
    public int Participants { get; set; } = 2;
    public DateOnly? StartDate { get; set; }
    public VehicleType VehicleType { get; set; } = VehicleType.Minivan;
    public bool WithGuide { get; set; } = true;
    public Guid? OperatorId { get; set; }
    public Operator? Operator { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<RoutePoint> Points { get; set; } = new();
}

public class RoutePoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RouteId { get; set; }
    public UserRoute Route { get; set; } = null!;
    public Guid PoiId { get; set; }
    public Poi Poi { get; set; } = null!;
    public int Day { get; set; }
    public int Order { get; set; }
    public int Nights { get; set; }
}

public class Booking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid OperatorId { get; set; }
    public Operator Operator { get; set; } = null!;
    public Guid? DepartureId { get; set; }
    public Departure? Departure { get; set; }
    public Guid? RouteId { get; set; }
    public UserRoute? Route { get; set; }
    public int Participants { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal PriceCalc { get; set; }
    public decimal? PriceFinal { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.New;
    public string? Comment { get; set; }
    public string ContactPhone { get; set; } = "";
    public string? OperatorNote { get; set; }
    public bool SeatsReserved { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<BookingHistory> History { get; set; } = new();
    public Review? Review { get; set; }
}

public class BookingHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public BookingStatus? FromStatus { get; set; }
    public BookingStatus ToStatus { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public User? ChangedBy { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid OperatorId { get; set; }
    public Guid? TourId { get; set; }
    public Tour? Tour { get; set; }
    public int Rating { get; set; }
    public string Text { get; set; } = "";
    public string? OperatorReply { get; set; }
    public ReviewStatus Status { get; set; } = ReviewStatus.Published;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Избранное: тур или направление (ровно одно из двух).</summary>
public class Favorite
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid? TourId { get; set; }
    public Tour? Tour { get; set; }
    public Guid? DestinationId { get; set; }
    public Destination? Destination { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Article
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string Lead { get; set; } = "";
    /// <summary>Текст статьи: абзацы через пустую строку, подзаголовки — строки с «## ».</summary>
    public string Body { get; set; } = "";
    public string Topic { get; set; } = "";
    public string AuthorName { get; set; } = "Редакция TurMax";
    public int ReadingMinutes { get; set; } = 5;
    public bool IsPublished { get; set; } = true;
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public Guid? DestinationId { get; set; }
    public Destination? Destination { get; set; }
    public List<Photo> Photos { get; set; } = new();
}

/// <summary>Метаданные изображения: файл хранится по ссылке, не в БД.</summary>
public class Photo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Url { get; set; } = "";
    public string Alt { get; set; } = "";
    public string? Author { get; set; }
    public string? License { get; set; }
    public string? SourceUrl { get; set; }
    public int SortOrder { get; set; }
    public Guid? DestinationId { get; set; }
    public Guid? PoiId { get; set; }
    public Guid? TourId { get; set; }
    public Guid? ArticleId { get; set; }
}

public class AuditLog
{
    public long Id { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? Ip { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
