using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Заявки туриста (FR-08, FR-11).</summary>
[ApiController]
[Route("api/bookings")]
[Authorize(Roles = Roles.Tourist)]
public class BookingsController(AppDbContext db, BookingService bookings) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest req, CancellationToken ct)
    {
        var b = await bookings.CreateAsync(User.UserId(), req, ct);
        var full = await bookings.GetForTouristAsync(b.Id, b.UserId, ct);
        return CreatedAtAction(nameof(Get), new { id = b.Id }, BookingService.ToDto(full, false));
    }

    [HttpGet("my")]
    public async Task<IReadOnlyList<BookingDto>> My(CancellationToken ct)
    {
        var uid = User.UserId();
        var list = await db.Bookings.Where(b => b.UserId == uid)
            .Include(b => b.User).Include(b => b.Operator).Include(b => b.Departure).ThenInclude(d => d!.Tour)
            .Include(b => b.Route).Include(b => b.Review).Include(b => b.History).ThenInclude(h => h.ChangedBy)
            .AsSplitQuery().OrderByDescending(b => b.CreatedAt).ToListAsync(ct);
        return list.Select(b => BookingService.ToDto(b, false)).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<BookingDto> Get(Guid id, CancellationToken ct) => BookingService.ToDto(await bookings.GetForTouristAsync(id, User.UserId(), ct), false);

    public record CancelRequest(string? Reason);

    [HttpPost("{id:guid}/cancel")]
    public async Task<BookingDto> Cancel(Guid id, CancelRequest? req, CancellationToken ct) =>
        BookingService.ToDto(await bookings.CancelAsync(id, User.UserId(), req?.Reason, ct), false);

    /// <summary>Согласие туриста с ценой, изменённой оператором.</summary>
    [HttpPost("{id:guid}/accept-price")]
    public async Task<BookingDto> AcceptPrice(Guid id, CancellationToken ct) =>
        BookingService.ToDto(await bookings.AcceptPriceAsync(id, User.UserId(), ct), false);

    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> Review(Guid id, ReviewRequest req, CancellationToken ct)
    {
        var r = await bookings.AddReviewAsync(id, User.UserId(), req, ct);
        return Created($"/api/reviews/{r.Id}", new { r.Id });
    }
}

/// <summary>Избранные туры и направления (FR-07).</summary>
[ApiController]
[Route("api/favorites")]
[Authorize(Roles = Roles.Tourist)]
public class FavoritesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<FavoriteDto>> List(CancellationToken ct)
    {
        var uid = User.UserId();
        var favs = await db.Favorites.Where(f => f.UserId == uid).OrderByDescending(f => f.CreatedAt)
            .Select(f => new { f.Id, f.TourId, f.DestinationId, f.CreatedAt }).ToListAsync(ct);
        var tourIds = favs.Where(f => f.TourId != null).Select(f => f.TourId!.Value).ToList();
        var destIds = favs.Where(f => f.DestinationId != null).Select(f => f.DestinationId!.Value).ToList();
        var tours = await db.Tours.Where(t => tourIds.Contains(t.Id)).Where(Projections.IsPublic).Select(Projections.TourCard).ToDictionaryAsync(t => t.Id, ct);
        var dests = await db.Destinations.Where(d => destIds.Contains(d.Id)).Select(Projections.DestinationCard).ToDictionaryAsync(d => d.Id, ct);
        return favs.Select(f => new FavoriteDto(f.Id, f.TourId is { } t ? tours.GetValueOrDefault(t) : null,
                f.DestinationId is { } d ? dests.GetValueOrDefault(d) : null, f.CreatedAt))
            .Where(f => f.Tour != null || f.Destination != null).ToList();
    }

    /// <summary>Идентификаторы избранного — для отметок «сердечком» в карточках.</summary>
    [HttpGet("ids")]
    public async Task<object> Ids(CancellationToken ct)
    {
        var uid = User.UserId();
        var favs = await db.Favorites.Where(f => f.UserId == uid).Select(f => new { f.TourId, f.DestinationId }).ToListAsync(ct);
        return new { tours = favs.Where(f => f.TourId != null).Select(f => f.TourId), destinations = favs.Where(f => f.DestinationId != null).Select(f => f.DestinationId) };
    }

    [HttpPost]
    public async Task<IActionResult> Add(FavoriteRequest req, CancellationToken ct)
    {
        if ((req.TourId is null) == (req.DestinationId is null)) throw AppException.BadRequest("Укажите тур или направление");
        var uid = User.UserId();
        if (req.TourId is { } tid && !await db.Tours.AnyAsync(t => t.Id == tid, ct)) throw AppException.NotFound("Тур не найден");
        if (req.DestinationId is { } did && !await db.Destinations.AnyAsync(d => d.Id == did, ct)) throw AppException.NotFound("Направление не найдено");
        var exists = await db.Favorites.AnyAsync(f => f.UserId == uid && f.TourId == req.TourId && f.DestinationId == req.DestinationId, ct);
        if (!exists)
        {
            db.Favorites.Add(new Favorite { UserId = uid, TourId = req.TourId, DestinationId = req.DestinationId });
            await db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Remove([FromQuery] Guid? tourId, [FromQuery] Guid? destinationId, CancellationToken ct)
    {
        var uid = User.UserId();
        await db.Favorites.Where(f => f.UserId == uid && f.TourId == tourId && f.DestinationId == destinationId).ExecuteDeleteAsync(ct);
        return NoContent();
    }
}

/// <summary>Уведомления в личном кабинете (FR-12).</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<NotificationDto>> List(CancellationToken ct)
    {
        var uid = User.UserId();
        return await db.Notifications.Where(n => n.UserId == uid).OrderByDescending(n => n.CreatedAt).Take(50)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Body, n.Link, n.IsRead, n.CreatedAt)).ToListAsync(ct);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        var uid = User.UserId();
        await db.Notifications.Where(n => n.UserId == uid && !n.IsRead).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return NoContent();
    }
}
