using Microsoft.EntityFrameworkCore;
using TurMax.Api.Entities;

namespace TurMax.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Operator> Operators => Set<Operator>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Destination> Destinations => Set<Destination>();
    public DbSet<Poi> Pois => Set<Poi>();
    public DbSet<Tour> Tours => Set<Tour>();
    public DbSet<TourPoint> TourPoints => Set<TourPoint>();
    public DbSet<Departure> Departures => Set<Departure>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<UserRoute> UserRoutes => Set<UserRoute>();
    public DbSet<RoutePoint> RoutePoints => Set<RoutePoint>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingHistory> BookingHistory => Set<BookingHistory>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Translation> Translations => Set<Translation>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<decimal>().HavePrecision(12, 2);
        b.Properties<string>().HaveMaxLength(400);
    }

    protected override void OnModelCreating(ModelBuilder m)
    {
        const string text = "nvarchar(max)";

        m.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Language).HasMaxLength(5);
            e.HasOne(x => x.Operator).WithOne(o => o.User).HasForeignKey<Operator>(o => o.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        m.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.Property(x => x.TokenHash).HasMaxLength(88);
        });

        m.Entity<Operator>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Description).HasColumnType(text);
            e.Property(x => x.Margin).HasPrecision(5, 4);
            e.Property(x => x.Rating).HasPrecision(3, 2);
        });

        m.Entity<Region>().HasIndex(x => x.Slug).IsUnique();
        m.Entity<Category>().HasIndex(x => x.Slug).IsUnique();
        m.Entity<Category>().Property(x => x.Description).HasColumnType(text);

        m.Entity<Destination>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Description).HasColumnType(text);
            e.Property(x => x.Summary).HasMaxLength(1000);
            e.Property(x => x.Highlights).HasColumnType(text);
            e.Property(x => x.Latitude).HasPrecision(9, 6);
            e.Property(x => x.Longitude).HasPrecision(9, 6);
            e.HasOne(x => x.Region).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Categories).WithMany(c => c.Destinations).UsingEntity(j => j.ToTable("DestinationCategories"));
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(p => p.DestinationId).OnDelete(DeleteBehavior.Cascade);
        });

        m.Entity<Poi>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => new { x.Latitude, x.Longitude });
            e.Property(x => x.Description).HasColumnType(text);
            e.Property(x => x.Summary).HasMaxLength(1000);
            e.Property(x => x.Latitude).HasPrecision(9, 6);
            e.Property(x => x.Longitude).HasPrecision(9, 6);
            e.HasOne(x => x.Region).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Destination).WithMany(d => d.Pois).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(p => p.PoiId).OnDelete(DeleteBehavior.Cascade);
        });

        m.Entity<Tour>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => new { x.RegionId, x.Status });
            e.Property(x => x.Description).HasColumnType(text);
            e.Property(x => x.Summary).HasMaxLength(1000);
            e.Property(x => x.Recommendations).HasColumnType(text);
            e.Property(x => x.Includes).HasColumnType(text);
            e.Property(x => x.Rating).HasPrecision(3, 2);
            e.HasOne(x => x.Operator).WithMany(o => o.Tours).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Region).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Category).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(p => p.TourId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("CK_Tours_Days", "[Days] BETWEEN 1 AND 60"));
        });

        m.Entity<TourPoint>(e =>
        {
            e.HasOne(x => x.Tour).WithMany(t => t.Points).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Poi).WithMany().OnDelete(DeleteBehavior.Restrict);
        });

        m.Entity<Departure>(e =>
        {
            e.HasOne(x => x.Tour).WithMany(t => t.Departures).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("CK_Departures_Seats", "[SeatsAvailable] >= 0 AND [SeatsAvailable] <= [SeatsTotal]"));
        });

        m.Entity<Service>().HasOne(x => x.Operator).WithMany(o => o.Services).OnDelete(DeleteBehavior.Cascade);

        m.Entity<UserRoute>(e =>
        {
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Operator).WithMany().OnDelete(DeleteBehavior.SetNull);
        });
        m.Entity<RoutePoint>(e =>
        {
            // Композиция: точки удаляются вместе с маршрутом (п. 2.4).
            e.HasOne(x => x.Route).WithMany(r => r.Points).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Poi).WithMany().OnDelete(DeleteBehavior.Restrict);
        });

        m.Entity<Booking>(e =>
        {
            e.HasIndex(x => new { x.OperatorId, x.Status });
            e.Property(x => x.Comment).HasMaxLength(2000);
            e.Property(x => x.OperatorNote).HasMaxLength(2000);
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Operator).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Departure).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Route).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t =>
            {
                // Аналог CHECK (num_nonnulls(departure_id, route_id) = 1) из табл. 2.4.
                t.HasCheckConstraint("CK_Bookings_Target", "([DepartureId] IS NULL AND [RouteId] IS NOT NULL) OR ([DepartureId] IS NOT NULL AND [RouteId] IS NULL)");
                t.HasCheckConstraint("CK_Bookings_Participants", "[Participants] BETWEEN 1 AND 50");
            });
        });

        m.Entity<BookingHistory>(e =>
        {
            e.HasOne(x => x.Booking).WithMany(b => b.History).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ChangedBy).WithMany().OnDelete(DeleteBehavior.Restrict);
        });

        m.Entity<Review>(e =>
        {
            e.HasIndex(x => x.BookingId).IsUnique();
            e.Property(x => x.Text).HasMaxLength(3000);
            e.Property(x => x.OperatorReply).HasMaxLength(2000);
            e.HasOne(x => x.Booking).WithOne(b => b.Review).HasForeignKey<Review>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Tour).WithMany().OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint("CK_Reviews_Rating", "[Rating] BETWEEN 1 AND 5"));
        });

        m.Entity<Favorite>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.TourId }).IsUnique().HasFilter("[TourId] IS NOT NULL");
            e.HasIndex(x => new { x.UserId, x.DestinationId }).IsUnique().HasFilter("[DestinationId] IS NOT NULL");
            e.HasOne(x => x.User).WithMany().OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Tour).WithMany().OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Destination).WithMany().OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint("CK_Favorites_Target", "([TourId] IS NULL AND [DestinationId] IS NOT NULL) OR ([TourId] IS NOT NULL AND [DestinationId] IS NULL)"));
        });

        m.Entity<Article>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Body).HasColumnType(text);
            e.Property(x => x.Lead).HasMaxLength(1000);
            e.HasOne(x => x.Destination).WithMany().OnDelete(DeleteBehavior.SetNull);
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(p => p.ArticleId).OnDelete(DeleteBehavior.Cascade);
        });

        m.Entity<Photo>(e =>
        {
            e.Property(x => x.Url).HasMaxLength(1000);
            e.Property(x => x.SourceUrl).HasMaxLength(1000);
        });

        m.Entity<AuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Details).HasMaxLength(2000);
        });

        m.Entity<Notification>().HasIndex(x => new { x.UserId, x.IsRead });

        m.Entity<Translation>(e =>
        {
            e.Property(x => x.EntityType).HasMaxLength(32);
            e.Property(x => x.EntityId).HasMaxLength(64);
            e.Property(x => x.Field).HasMaxLength(32);
            e.Property(x => x.Lang).HasMaxLength(5);
            e.Property(x => x.Value).HasColumnType(text);
            e.HasIndex(x => new { x.EntityType, x.Lang, x.EntityId, x.Field }).IsUnique();
        });

        // Идентификаторы Guid генерируются в коде (Guid.NewGuid()), поэтому новые объекты, добавленные
        // через навигационные свойства, EF Core должен считать новыми, а не уже существующими.
        foreach (var et in m.Model.GetEntityTypes())
            if (et.FindProperty("Id") is { ClrType: var t } id && t == typeof(Guid))
                id.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never;
    }
}
