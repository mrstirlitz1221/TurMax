using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Модуль Admin: пользователи, модерация, справочники, контент, журнал (FR-17 – FR-20).</summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController(AppDbContext db, AuditService audit, BookingService bookings) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<AdminStatsDto> Stats(CancellationToken ct) => new(
        await db.Users.CountAsync(ct), await db.Users.CountAsync(u => u.Role == UserRole.Tourist, ct),
        await db.Operators.CountAsync(ct), await db.Operators.CountAsync(o => o.Verification == VerificationStatus.Pending, ct),
        await db.Tours.CountAsync(t => t.Status == TourStatus.Published, ct), await db.Tours.CountAsync(t => t.Status == TourStatus.Pending, ct),
        await db.Bookings.CountAsync(ct),
        await db.Bookings.CountAsync(b => b.Status == BookingStatus.New || b.Status == BookingStatus.InReview || b.Status == BookingStatus.PriceChanged || b.Status == BookingStatus.Confirmed, ct),
        await db.Reviews.CountAsync(ct), await db.Destinations.CountAsync(ct), await db.Pois.CountAsync(ct), await db.Articles.CountAsync(ct));

    // ---------- Пользователи ----------

    [HttpGet("users")]
    public async Task<IReadOnlyList<AdminUserDto>> Users([FromQuery] string? q, CancellationToken ct)
    {
        var query = db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(u => u.Email.Contains(q) || u.FullName.Contains(q));
        return await query.OrderByDescending(u => u.CreatedAt).Take(200)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.FullName, u.Role.ToString(), u.IsBlocked, u.CreatedAt, u.Operator != null ? u.Operator.Name : null))
            .ToListAsync(ct);
    }

    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, AdminUserUpdate req, CancellationToken ct)
    {
        var u = await db.Users.Include(x => x.Operator).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Пользователь не найден");
        if (u.Id == User.UserId()) throw AppException.Conflict("Нельзя изменить собственную роль или заблокировать себя");
        if (req.Role is { } role)
        {
            if (role == UserRole.Operator && u.Operator is null)
                db.Operators.Add(new Operator { UserId = u.Id, Name = u.FullName, Slug = Text.Slugify(u.FullName) + "-" + Guid.NewGuid().ToString("N")[..6], Email = u.Email });
            u.Role = role;
        }
        if (req.IsBlocked is { } blocked)
        {
            u.IsBlocked = blocked;
            if (blocked)
                await db.RefreshTokens.Where(t => t.UserId == u.Id && t.RevokedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);
        }
        audit.Log("admin.user_updated", "User", u.Id, $"role={u.Role}, blocked={u.IsBlocked}");
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Операторы ----------

    [HttpGet("operators")]
    public async Task<IReadOnlyList<AdminOperatorDto>> Operators(CancellationToken ct) =>
        await db.Operators.OrderBy(o => o.Verification).ThenBy(o => o.Name)
            .Select(o => new AdminOperatorDto(o.Id, o.Name, o.Slug, o.Kind, o.Verification, o.User.Email, o.Tours.Count, o.Rating, o.IsDemo, o.CreatedAt))
            .ToListAsync(ct);

    /// <summary>Проверка и блокировка оператора (PATCH /api/admin/operators/{id}).</summary>
    [HttpPatch("operators/{id:guid}")]
    public async Task<IActionResult> UpdateOperator(Guid id, AdminOperatorUpdate req, CancellationToken ct)
    {
        var o = await db.Operators.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Оператор не найден");
        o.Verification = req.Verification;
        audit.Log("admin.operator_verification", "Operator", o.Id, req.Verification.ToString());
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Модерация туров ----------

    [HttpGet("tours")]
    public async Task<IReadOnlyList<AdminTourDto>> Tours([FromQuery] TourStatus? status, CancellationToken ct)
    {
        var q = db.Tours.AsQueryable();
        if (status is not null) q = q.Where(t => t.Status == status);
        return await q.OrderBy(t => t.Status == TourStatus.Pending ? 0 : 1).ThenByDescending(t => t.UpdatedAt)
            .Select(t => new AdminTourDto(t.Id, t.Slug, t.Title, t.Operator.Name, t.Status, t.ModerationNote, t.UpdatedAt)).ToListAsync(ct);
    }

    [HttpPatch("tours/{id:guid}")]
    public async Task<IActionResult> ModerateTour(Guid id, AdminTourUpdate req, CancellationToken ct)
    {
        var t = await db.Tours.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Тур не найден");
        if (req.Status == TourStatus.Rejected && string.IsNullOrWhiteSpace(req.Note)) throw AppException.BadRequest("Укажите причину отклонения");
        t.Status = req.Status;
        t.ModerationNote = req.Note;
        audit.Log("admin.tour_moderated", "Tour", t.Id, $"{req.Status}: {req.Note}");
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Модерация отзывов ----------

    [HttpGet("reviews")]
    public async Task<IReadOnlyList<OperatorReviewDto>> Reviews(CancellationToken ct) =>
        await db.Reviews.OrderByDescending(r => r.CreatedAt).Take(200)
            .Select(r => new OperatorReviewDto(r.Id, r.User.FullName, r.Rating, r.Text, r.OperatorReply, r.CreatedAt, r.Tour != null ? r.Tour.Title : "Свой маршрут", r.Status))
            .ToListAsync(ct);

    [HttpPatch("reviews/{id:guid}")]
    public async Task<IActionResult> ModerateReview(Guid id, AdminReviewUpdate req, CancellationToken ct)
    {
        var r = await db.Reviews.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Отзыв не найден");
        r.Status = req.Status;
        await db.SaveChangesAsync(ct);
        await bookings.RecalculateRatingsAsync(r.OperatorId, r.TourId, ct);
        audit.Log("admin.review_moderated", "Review", r.Id, req.Status.ToString());
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------- Журнал ----------

    [HttpGet("audit")]
    public async Task<PagedResult<AuditDto>> Audit([FromQuery] string? action, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        const int size = 50;
        var q = db.AuditLogs.AsQueryable();
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(a => a.Action.StartsWith(action));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.Id).Skip((page - 1) * size).Take(size)
            .Select(a => new AuditDto(a.Id, a.CreatedAt, a.UserEmail, a.Action, a.EntityType, a.EntityId, a.Details, a.Ip)).ToListAsync(ct);
        return new PagedResult<AuditDto>(items, total, page, size);
    }

    // ---------- Справочники: регионы и категории ----------

    [HttpPost("regions")]
    public async Task<RegionDto> AddRegion(RegionRequest req, CancellationToken ct)
    {
        if (await db.Regions.AnyAsync(r => r.Slug == req.Slug, ct)) throw AppException.Conflict("Регион с таким адресом уже есть");
        var r = new Region { Name = req.Name.Trim(), Slug = req.Slug, Center = req.Center };
        db.Regions.Add(r);
        await db.SaveChangesAsync(ct);
        audit.Log("admin.region_created", "Region", r.Id, r.Name);
        await db.SaveChangesAsync(ct);
        return r.ToDto();
    }

    [HttpPut("regions/{id:int}")]
    public async Task<RegionDto> UpdateRegion(int id, RegionRequest req, CancellationToken ct)
    {
        var r = await db.Regions.FindAsync([id], ct) ?? throw AppException.NotFound("Регион не найден");
        if (await db.Regions.AnyAsync(x => x.Slug == req.Slug && x.Id != id, ct)) throw AppException.Conflict("Регион с таким адресом уже есть");
        r.Name = req.Name.Trim(); r.Slug = req.Slug; r.Center = req.Center;
        audit.Log("admin.region_updated", "Region", r.Id, r.Name);
        await db.SaveChangesAsync(ct);
        return r.ToDto();
    }

    [HttpDelete("regions/{id:int}")]
    public async Task<IActionResult> DeleteRegion(int id, CancellationToken ct)
    {
        var used = await db.Tours.AnyAsync(t => t.RegionId == id, ct) || await db.Pois.AnyAsync(p => p.RegionId == id, ct) || await db.Destinations.AnyAsync(d => d.RegionId == id, ct);
        if (used) throw AppException.Conflict("Регион используется в турах или точках");
        if (await db.Regions.Where(r => r.Id == id).ExecuteDeleteAsync(ct) == 0) throw AppException.NotFound("Регион не найден");
        audit.Log("admin.region_deleted", "Region", id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("categories")]
    public async Task<IActionResult> AddCategory(CategoryRequest req, CancellationToken ct)
    {
        if (await db.Categories.AnyAsync(c => c.Slug == req.Slug, ct)) throw AppException.Conflict("Категория с таким адресом уже есть");
        var c = new Category();
        Apply(c, req);
        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);
        audit.Log("admin.category_created", "Category", c.Id, c.Name);
        await db.SaveChangesAsync(ct);
        return Created($"/api/categories/{c.Slug}", new { c.Id });
    }

    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, CategoryRequest req, CancellationToken ct)
    {
        var c = await db.Categories.FindAsync([id], ct) ?? throw AppException.NotFound("Категория не найдена");
        if (await db.Categories.AnyAsync(x => x.Slug == req.Slug && x.Id != id, ct)) throw AppException.Conflict("Категория с таким адресом уже есть");
        Apply(c, req);
        audit.Log("admin.category_updated", "Category", c.Id, c.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken ct)
    {
        if (await db.Tours.AnyAsync(t => t.CategoryId == id, ct)) throw AppException.Conflict("Категория используется в турах");
        var c = await db.Categories.Include(x => x.Destinations).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Категория не найдена");
        db.Categories.Remove(c);
        audit.Log("admin.category_deleted", "Category", id, c.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    static void Apply(Category c, CategoryRequest r)
    {
        c.Name = r.Name.Trim(); c.Slug = r.Slug; c.Tagline = r.Tagline.Trim(); c.Description = r.Description.Trim();
        c.ImageUrl = r.ImageUrl; c.ImageCredit = r.ImageCredit; c.SortOrder = r.SortOrder;
    }

    static List<Photo> ToPhotos(IEnumerable<PhotoInput> input, string alt) =>
        input.Select((p, i) => new Photo { Url = p.Url.Trim(), Alt = string.IsNullOrWhiteSpace(p.Alt) ? alt : p.Alt, Author = p.Author, License = p.License, SourceUrl = p.SourceUrl, SortOrder = i }).ToList();

    static List<PhotoInput> ToInputs(IEnumerable<Photo> photos) =>
        photos.OrderBy(p => p.SortOrder).Select(p => new PhotoInput { Url = p.Url, Alt = p.Alt, Author = p.Author, License = p.License, SourceUrl = p.SourceUrl }).ToList();

    async Task<string> UniqueSlugAsync<T>(IQueryable<T> set, Func<string, System.Linq.Expressions.Expression<Func<T, bool>>> bySlug, string? requested, string name, CancellationToken ct)
    {
        var slug = string.IsNullOrWhiteSpace(requested) ? Text.Slugify(name) : requested;
        if (string.IsNullOrEmpty(slug)) slug = Guid.NewGuid().ToString("N")[..8];
        return await set.AnyAsync(bySlug(slug), ct) ? $"{slug}-{Guid.NewGuid().ToString("N")[..4]}" : slug;
    }

    // ---------- Направления ----------

    [HttpGet("destinations")]
    public async Task<IReadOnlyList<AdminListItem>> Destinations(CancellationToken ct) =>
        await db.Destinations.OrderBy(d => d.SortOrder).Select(d => new AdminListItem(d.Id, d.Slug, d.Name, d.Region.Name, true)).ToListAsync(ct);

    [HttpGet("destinations/{id:guid}")]
    public async Task<DestinationEditDto> Destination(Guid id, CancellationToken ct)
    {
        var d = await db.Destinations.Include(x => x.Categories).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        return new DestinationEditDto(d.Id, d.Slug, d.Name, d.Tagline, d.Summary, d.Description, d.RegionId, d.Latitude, d.Longitude, d.BestTime,
            d.Highlights, d.IsFeatured, d.SortOrder, d.Categories.Select(c => c.Id).ToList(), ToInputs(d.Photos));
    }

    [HttpPost("destinations")]
    public async Task<IActionResult> AddDestination(DestinationRequest req, CancellationToken ct)
    {
        var d = new Destination { Slug = await UniqueSlugAsync(db.Destinations, s => x => x.Slug == s, req.Slug, req.Name, ct) };
        await ApplyAsync(d, req, ct);
        db.Destinations.Add(d);
        audit.Log("admin.destination_created", "Destination", d.Id, d.Name);
        await db.SaveChangesAsync(ct);
        return Created($"/api/destinations/{d.Slug}", new { d.Id, d.Slug });
    }

    [HttpPut("destinations/{id:guid}")]
    public async Task<IActionResult> UpdateDestination(Guid id, DestinationRequest req, CancellationToken ct)
    {
        var d = await db.Destinations.Include(x => x.Categories).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        if (!string.IsNullOrWhiteSpace(req.Slug) && req.Slug != d.Slug)
        {
            if (await db.Destinations.AnyAsync(x => x.Slug == req.Slug, ct)) throw AppException.Conflict("Адрес уже занят");
            d.Slug = req.Slug;
        }
        await ApplyAsync(d, req, ct);
        audit.Log("admin.destination_updated", "Destination", d.Id, d.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("destinations/{id:guid}")]
    public async Task<IActionResult> DeleteDestination(Guid id, CancellationToken ct)
    {
        var d = await db.Destinations.Include(x => x.Categories).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        await db.Pois.Where(p => p.DestinationId == id).ExecuteUpdateAsync(s => s.SetProperty(p => p.DestinationId, (Guid?)null), ct);
        await db.Articles.Where(a => a.DestinationId == id).ExecuteUpdateAsync(s => s.SetProperty(a => a.DestinationId, (Guid?)null), ct);
        db.Destinations.Remove(d);
        audit.Log("admin.destination_deleted", "Destination", id, d.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    async Task ApplyAsync(Destination d, DestinationRequest r, CancellationToken ct)
    {
        if (!await db.Regions.AnyAsync(x => x.Id == r.RegionId, ct)) throw AppException.BadRequest("Регион не найден");
        d.Name = r.Name.Trim(); d.Tagline = r.Tagline.Trim(); d.Summary = r.Summary.Trim(); d.Description = r.Description.Trim();
        d.RegionId = r.RegionId; d.Latitude = r.Latitude; d.Longitude = r.Longitude; d.BestTime = r.BestTime; d.Highlights = r.Highlights.Trim();
        d.IsFeatured = r.IsFeatured; d.SortOrder = r.SortOrder;
        d.Categories.Clear();
        d.Categories.AddRange(await db.Categories.Where(c => r.CategoryIds.Contains(c.Id)).ToListAsync(ct));
        db.Photos.RemoveRange(d.Photos);
        d.Photos.Clear();
        d.Photos.AddRange(ToPhotos(r.Photos, d.Name));
    }

    // ---------- Точки интереса ----------

    [HttpGet("poi")]
    public async Task<IReadOnlyList<AdminListItem>> Pois(CancellationToken ct) =>
        await db.Pois.OrderBy(p => p.Name).Select(p => new AdminListItem(p.Id, p.Slug, p.Name, p.Region.Name, p.IsPublished)).ToListAsync(ct);

    [HttpGet("poi/{id:guid}")]
    public async Task<PoiEditDto> Poi(Guid id, CancellationToken ct)
    {
        var p = await db.Pois.Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        return new PoiEditDto(p.Id, p.Slug, p.Name, p.Kind, p.Summary, p.Description, p.RegionId, p.DestinationId, p.Latitude, p.Longitude, p.AltitudeM,
            p.RoadType, p.EntryFee, p.LodgingPrice, p.NeedsPermit, p.Season, p.IsPublished, ToInputs(p.Photos));
    }

    [HttpPost("poi")]
    public async Task<IActionResult> AddPoi(PoiRequest req, CancellationToken ct)
    {
        var p = new Poi { Slug = await UniqueSlugAsync(db.Pois, s => x => x.Slug == s, req.Slug, req.Name, ct) };
        await ApplyAsync(p, req, ct);
        db.Pois.Add(p);
        audit.Log("admin.poi_created", "Poi", p.Id, p.Name);
        await db.SaveChangesAsync(ct);
        return Created($"/api/poi/{p.Slug}", new { p.Id, p.Slug });
    }

    [HttpPut("poi/{id:guid}")]
    public async Task<IActionResult> UpdatePoi(Guid id, PoiRequest req, CancellationToken ct)
    {
        var p = await db.Pois.Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        if (!string.IsNullOrWhiteSpace(req.Slug) && req.Slug != p.Slug)
        {
            if (await db.Pois.AnyAsync(x => x.Slug == req.Slug, ct)) throw AppException.Conflict("Адрес уже занят");
            p.Slug = req.Slug;
        }
        await ApplyAsync(p, req, ct);
        audit.Log("admin.poi_updated", "Poi", p.Id, p.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("poi/{id:guid}")]
    public async Task<IActionResult> DeletePoi(Guid id, CancellationToken ct)
    {
        if (await db.TourPoints.AnyAsync(t => t.PoiId == id, ct) || await db.RoutePoints.AnyAsync(r => r.PoiId == id, ct))
            throw AppException.Conflict("Точка используется в турах или маршрутах — снимите её с публикации вместо удаления");
        var p = await db.Pois.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        db.Pois.Remove(p);
        audit.Log("admin.poi_deleted", "Poi", id, p.Name);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    async Task ApplyAsync(Poi p, PoiRequest r, CancellationToken ct)
    {
        if (!await db.Regions.AnyAsync(x => x.Id == r.RegionId, ct)) throw AppException.BadRequest("Регион не найден");
        if (r.DestinationId is { } did && !await db.Destinations.AnyAsync(x => x.Id == did, ct)) throw AppException.BadRequest("Направление не найдено");
        p.Name = r.Name.Trim(); p.Kind = r.Kind; p.Summary = r.Summary.Trim(); p.Description = r.Description.Trim(); p.RegionId = r.RegionId;
        p.DestinationId = r.DestinationId; p.Latitude = r.Latitude; p.Longitude = r.Longitude; p.AltitudeM = r.AltitudeM; p.RoadType = r.RoadType;
        p.EntryFee = r.EntryFee; p.LodgingPrice = r.LodgingPrice; p.NeedsPermit = r.NeedsPermit; p.Season = r.Season; p.IsPublished = r.IsPublished;
        db.Photos.RemoveRange(p.Photos);
        p.Photos.Clear();
        p.Photos.AddRange(ToPhotos(r.Photos, p.Name));
    }

    // ---------- Статьи ----------

    [HttpGet("articles")]
    public async Task<IReadOnlyList<AdminListItem>> Articles(CancellationToken ct) =>
        await db.Articles.OrderByDescending(a => a.PublishedAt).Select(a => new AdminListItem(a.Id, a.Slug, a.Title, a.Topic, a.IsPublished)).ToListAsync(ct);

    [HttpGet("articles/{id:guid}")]
    public async Task<ArticleEditDto> Article(Guid id, CancellationToken ct)
    {
        var a = await db.Articles.Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        return new ArticleEditDto(a.Id, a.Slug, a.Title, a.Lead, a.Body, a.Topic, a.AuthorName, a.ReadingMinutes, a.IsPublished, a.PublishedAt, a.DestinationId, ToInputs(a.Photos));
    }

    [HttpPost("articles")]
    public async Task<IActionResult> AddArticle(ArticleRequest req, CancellationToken ct)
    {
        var a = new Article { Slug = await UniqueSlugAsync(db.Articles, s => x => x.Slug == s, req.Slug, req.Title, ct), PublishedAt = DateTime.UtcNow };
        await ApplyAsync(a, req, ct);
        db.Articles.Add(a);
        audit.Log("admin.article_created", "Article", a.Id, a.Title);
        await db.SaveChangesAsync(ct);
        return Created($"/api/articles/{a.Slug}", new { a.Id, a.Slug });
    }

    [HttpPut("articles/{id:guid}")]
    public async Task<IActionResult> UpdateArticle(Guid id, ArticleRequest req, CancellationToken ct)
    {
        var a = await db.Articles.Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        if (!string.IsNullOrWhiteSpace(req.Slug) && req.Slug != a.Slug)
        {
            if (await db.Articles.AnyAsync(x => x.Slug == req.Slug, ct)) throw AppException.Conflict("Адрес уже занят");
            a.Slug = req.Slug;
        }
        await ApplyAsync(a, req, ct);
        audit.Log("admin.article_updated", "Article", a.Id, a.Title);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("articles/{id:guid}")]
    public async Task<IActionResult> DeleteArticle(Guid id, CancellationToken ct)
    {
        var a = await db.Articles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound();
        db.Articles.Remove(a);
        audit.Log("admin.article_deleted", "Article", id, a.Title);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    async Task ApplyAsync(Article a, ArticleRequest r, CancellationToken ct)
    {
        if (r.DestinationId is { } did && !await db.Destinations.AnyAsync(x => x.Id == did, ct)) throw AppException.BadRequest("Направление не найдено");
        a.Title = r.Title.Trim(); a.Lead = r.Lead.Trim(); a.Body = r.Body.Trim(); a.Topic = r.Topic.Trim(); a.AuthorName = r.AuthorName.Trim();
        a.ReadingMinutes = r.ReadingMinutes; a.IsPublished = r.IsPublished; a.DestinationId = r.DestinationId;
        db.Photos.RemoveRange(a.Photos);
        a.Photos.Clear();
        a.Photos.AddRange(ToPhotos(r.Photos, a.Title));
    }
}
