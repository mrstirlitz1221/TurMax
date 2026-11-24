using System.Linq.Expressions;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;

namespace TurMax.Api.Services;

/// <summary>Проекции сущностей в DTO, транслируемые EF Core в SQL.</summary>
public static class Projections
{
    public static PhotoDto ToDto(this Photo p) => new(p.Url, p.Alt, p.Author, p.License, p.SourceUrl);

    public static readonly Expression<Func<Destination, DestinationCardDto>> DestinationCard = d => new DestinationCardDto(
        d.Id, d.Slug, d.Name, d.Tagline, d.Summary, d.Region.Name, d.Latitude, d.Longitude,
        d.Photos.OrderBy(p => p.SortOrder).Select(p => new PhotoDto(p.Url, p.Alt, p.Author, p.License, p.SourceUrl)).FirstOrDefault(),
        d.Categories.OrderBy(c => c.SortOrder).Select(c => c.Name).ToList());

    public static readonly Expression<Func<Poi, PoiCardDto>> PoiCard = p => new PoiCardDto(
        p.Id, p.Slug, p.Name, p.Kind, p.Summary, p.Region.Name, p.Latitude, p.Longitude, p.AltitudeM,
        p.Photos.OrderBy(x => x.SortOrder).Select(x => new PhotoDto(x.Url, x.Alt, x.Author, x.License, x.SourceUrl)).FirstOrDefault(),
        p.Destination != null ? p.Destination.Slug : null);

    public static readonly Expression<Func<Tour, TourCardDto>> TourCard = t => new TourCardDto(
        t.Id, t.Slug, t.Title, t.Summary, t.Region.Name, t.Category.Name, t.Category.Slug, t.Days, t.Difficulty,
        t.SeasonFromMonth, t.SeasonToMonth, t.PriceFrom, t.Rating, t.ReviewsCount, t.Operator.Name,
        t.Photos.OrderBy(x => x.SortOrder).Select(x => new PhotoDto(x.Url, x.Alt, x.Author, x.License, x.SourceUrl)).FirstOrDefault(),
        t.MaxAltitudeM, t.DistanceKm, t.GuideLanguages,
        // Ключевая точка тура для карты каталога: первая точка, не являющаяся городом.
        t.Points.OrderBy(p => p.Poi.Kind == PoiKind.City ? 1 : 0).ThenBy(p => p.Day).ThenBy(p => p.Order).Select(p => (decimal?)p.Poi.Latitude).FirstOrDefault(),
        t.Points.OrderBy(p => p.Poi.Kind == PoiKind.City ? 1 : 0).ThenBy(p => p.Day).ThenBy(p => p.Order).Select(p => (decimal?)p.Poi.Longitude).FirstOrDefault());

    public static readonly Expression<Func<Article, ArticleCardDto>> ArticleCard = a => new ArticleCardDto(
        a.Id, a.Slug, a.Title, a.Lead, a.Topic, a.ReadingMinutes, a.PublishedAt,
        a.Photos.OrderBy(x => x.SortOrder).Select(x => new PhotoDto(x.Url, x.Alt, x.Author, x.License, x.SourceUrl)).FirstOrDefault());

    public static RegionDto ToDto(this Region r) => new(r.Id, r.Name, r.Slug, r.Center);

    public static IReadOnlyList<string> Lines(string? s) =>
        (s ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    /// <summary>Публично видимый тур: опубликован и оператор не заблокирован.</summary>
    public static readonly Expression<Func<Tour, bool>> IsPublic = t =>
        t.Status == TourStatus.Published && t.Operator.Verification == VerificationStatus.Verified;
}
