using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;

namespace TurMax.Api.Services;

/// <summary>Модуль Bookings: заявки, переходы статусов, история, учёт мест (FR-08, FR-15, FR-11).</summary>
public class BookingService(AppDbContext db, RouteService routes, NotificationService notify, AuditService audit, TimeProvider clock)
{
    DateOnly Today => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

    IQueryable<Booking> Full => db.Bookings
        .Include(b => b.User).Include(b => b.Operator).ThenInclude(o => o.User)
        .Include(b => b.Departure).ThenInclude(d => d!.Tour)
        .Include(b => b.Route)
        .Include(b => b.Review)
        .Include(b => b.History.OrderBy(h => h.CreatedAt)).ThenInclude(h => h.ChangedBy);

    public static BookingDto ToDto(Booking b, bool forOperator) => new(
        b.Id, b.Status, b.Departure?.Tour.Title ?? b.Route?.Title ?? "Заявка", b.Departure?.Tour.Slug, b.RouteId, b.DepartureId,
        b.Participants, b.StartDate, b.EndDate, b.PriceCalc, b.PriceFinal, b.Comment, b.OperatorNote, b.Operator.Name,
        forOperator ? b.User.FullName : null, forOperator ? b.User.Email : null, b.ContactPhone,
        b.CreatedAt, b.UpdatedAt, b.Status == BookingStatus.Completed && b.Review == null, b.Review != null,
        b.History.OrderBy(h => h.CreatedAt).Select(h => new BookingHistoryDto(h.FromStatus, h.ToStatus, h.ChangedBy?.FullName ?? "Система", h.Note, h.CreatedAt)).ToList());

    public async Task<Booking> CreateAsync(Guid userId, CreateBookingRequest req, CancellationToken ct)
    {
        if ((req.DepartureId is null) == (req.RouteId is null))
            throw AppException.BadRequest("Укажите либо выезд готового тура, либо свой маршрут");
        var user = await db.Users.FindAsync([userId], ct) ?? throw new AppException(401, "Требуется вход в систему");

        var b = new Booking { UserId = userId, Participants = req.Participants, Comment = req.Comment?.Trim(), ContactPhone = req.ContactPhone.Trim() };
        Operator op;

        if (req.DepartureId is { } depId)
        {
            var dep = await db.Departures.Include(d => d.Tour).ThenInclude(t => t.Operator).ThenInclude(o => o.User)
                .FirstOrDefaultAsync(d => d.Id == depId, ct) ?? throw AppException.NotFound("Выезд не найден");
            if (dep.Tour.Status != TourStatus.Published || dep.Tour.Operator.Verification != VerificationStatus.Verified)
                throw AppException.NotFound("Тур недоступен для бронирования");
            if (dep.StartDate <= Today) throw AppException.BadRequest("Этот выезд уже начался");
            if (dep.SeatsAvailable < req.Participants) throw AppException.Conflict($"Недостаточно свободных мест: осталось {dep.SeatsAvailable}");
            op = dep.Tour.Operator;
            b.DepartureId = dep.Id;
            b.StartDate = dep.StartDate;
            b.EndDate = dep.StartDate.AddDays(dep.Tour.Days - 1);
            b.PriceCalc = dep.Price * req.Participants;
        }
        else
        {
            if (req.StartDate is not { } start || start <= Today) throw AppException.BadRequest("Укажите дату начала поездки в будущем");
            var route = await routes.GetOwnedAsync(req.RouteId!.Value, userId, ct);
            route.Participants = req.Participants;
            route.StartDate = start;
            // Сервер пересчитывает смету сам и не доверяет цене от клиента (п. 2.7).
            var (est, estOp) = await routes.EstimateAsync(route, ct);
            op = await db.Operators.Include(o => o.User).FirstAsync(o => o.Id == estOp.Id, ct);
            b.RouteId = route.Id;
            b.StartDate = start;
            b.EndDate = start.AddDays(Math.Max(est.Days, 1) - 1);
            b.PriceCalc = est.Total;
        }

        b.OperatorId = op.Id;
        b.History.Add(new BookingHistory { BookingId = b.Id, FromStatus = null, ToStatus = BookingStatus.New, ChangedByUserId = userId, Note = "Заявка создана" });
        db.Bookings.Add(b);
        notify.Notify(op.User, "Новая заявка", $"Поступила заявка от {user.FullName} на {b.StartDate:dd.MM.yyyy}, участников: {b.Participants}.", $"/operator/bookings/{b.Id}");
        await db.SaveChangesAsync(ct); // заявка, история и уведомление — одна транзакция
        return b;
    }

    public async Task<Booking> GetForTouristAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var b = await Full.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null || b.UserId != userId) throw AppException.NotFound("Заявка не найдена");
        return b;
    }

    public async Task<Booking> GetForOperatorAsync(Guid id, Guid operatorId, Guid userId, CancellationToken ct)
    {
        var b = await Full.FirstOrDefaultAsync(x => x.Id == id, ct);
        // Вторая проверка доступа (п. 2.9): оператор видит только свои заявки.
        if (b is null || b.OperatorId != operatorId) throw AppException.NotFound("Заявка не найдена");
        if (b.Status == BookingStatus.New)
        {
            BookingStateMachine.Move(b, BookingStatus.InReview, userId, "Оператор открыл заявку");
            await db.SaveChangesAsync(ct);
        }
        return b;
    }

    public async Task<Booking> OperatorActionAsync(Guid id, Guid operatorId, Guid userId, OperatorBookingAction req, CancellationToken ct)
    {
        var b = await GetForOperatorAsync(id, operatorId, userId, ct);
        b.OperatorNote = req.Note?.Trim();
        switch (req.Action)
        {
            case "confirm":
                await ConfirmAsync(b, userId, req.Note, ct);
                notify.Notify(b.User, "Заявка подтверждена", $"Оператор {b.Operator.Name} подтвердил вашу заявку. Итоговая цена: {b.PriceFinal:N0} сом.", $"/account/bookings/{b.Id}");
                break;
            case "reject":
                if (string.IsNullOrWhiteSpace(req.Note)) throw AppException.BadRequest("Укажите причину отклонения");
                BookingStateMachine.Move(b, BookingStatus.Rejected, userId, req.Note);
                notify.Notify(b.User, "Заявка отклонена", $"Оператор {b.Operator.Name} отклонил заявку. Причина: {req.Note}", $"/account/bookings/{b.Id}");
                break;
            case "changePrice":
                if (req.Price is not { } price) throw AppException.BadRequest("Укажите новую цену");
                BookingStateMachine.Move(b, BookingStatus.PriceChanged, userId, $"Новая цена: {price:N0} сом. {req.Note}".Trim());
                b.PriceFinal = price;
                notify.Notify(b.User, "Оператор изменил цену", $"Новая цена по заявке: {price:N0} сом. Подтвердите её в личном кабинете.", $"/account/bookings/{b.Id}");
                break;
        }
        audit.Log($"booking.{req.Action}", "Booking", b.Id, req.Note);
        await db.SaveChangesAsync(ct);
        return b;
    }

    /// <summary>
    /// Подтверждение с резервированием мест. UPDATE … WHERE SeatsAvailable >= n выполняется атомарно и блокирует строку
    /// выезда (аналог SELECT … FOR UPDATE из п. 2.7), поэтому одно место не будет продано дважды.
    /// </summary>
    async Task ConfirmAsync(Booking b, Guid userId, string? note, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        BookingStateMachine.Move(b, BookingStatus.Confirmed, userId, note);
        b.PriceFinal ??= b.PriceCalc;
        if (b.DepartureId is { } depId && !b.SeatsReserved)
        {
            var n = b.Participants;
            var updated = await db.Departures.Where(d => d.Id == depId && d.SeatsAvailable >= n)
                .ExecuteUpdateAsync(s => s.SetProperty(d => d.SeatsAvailable, d => d.SeatsAvailable - n), ct);
            if (updated == 0) throw AppException.Conflict("Недостаточно свободных мест на этот выезд");
            b.SeatsReserved = true;
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task<Booking> AcceptPriceAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var b = await GetForTouristAsync(id, userId, ct);
        await ConfirmAsync(b, userId, "Турист согласился с новой ценой", ct);
        notify.Notify(b.Operator.User, "Цена согласована", $"Турист {b.User.FullName} согласился с новой ценой. Заявка подтверждена.", $"/operator/bookings/{b.Id}");
        await db.SaveChangesAsync(ct);
        return b;
    }

    public async Task<Booking> CancelAsync(Guid id, Guid userId, string? reason, CancellationToken ct)
    {
        var b = await GetForTouristAsync(id, userId, ct);
        if (b.StartDate <= Today) throw AppException.Conflict("Отменить заявку можно только до начала тура");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        BookingStateMachine.Move(b, BookingStatus.Cancelled, userId, string.IsNullOrWhiteSpace(reason) ? "Отменена туристом" : reason);
        await ReleaseSeatsAsync(b, ct);
        notify.Notify(b.Operator.User, "Заявка отменена туристом", $"{b.User.FullName} отменил заявку на {b.StartDate:dd.MM.yyyy}.", $"/operator/bookings/{b.Id}");
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return b;
    }

    async Task ReleaseSeatsAsync(Booking b, CancellationToken ct)
    {
        if (b.DepartureId is not { } depId || !b.SeatsReserved) return;
        var n = b.Participants;
        await db.Departures.Where(d => d.Id == depId)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.SeatsAvailable, d => d.SeatsAvailable + n), ct);
        b.SeatsReserved = false;
    }

    public async Task<Review> AddReviewAsync(Guid bookingId, Guid userId, ReviewRequest req, CancellationToken ct)
    {
        var b = await GetForTouristAsync(bookingId, userId, ct);
        if (b.Status != BookingStatus.Completed) throw AppException.Conflict("Отзыв можно оставить только по завершённой поездке");
        if (b.Review is not null) throw AppException.Conflict("Отзыв по этой заявке уже оставлен");
        var review = new Review
        {
            BookingId = b.Id, UserId = userId, OperatorId = b.OperatorId, TourId = b.Departure?.TourId,
            Rating = req.Rating, Text = req.Text.Trim()
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync(ct);
        await RecalculateRatingsAsync(b.OperatorId, review.TourId, ct);
        notify.Notify(b.Operator.User, "Новый отзыв", $"{b.User.FullName} оценил поездку на {req.Rating} из 5.", "/operator/reviews");
        await db.SaveChangesAsync(ct);
        return review;
    }

    /// <summary>Пересчёт рейтинга тура и оператора по опубликованным отзывам.</summary>
    public async Task RecalculateRatingsAsync(Guid operatorId, Guid? tourId, CancellationToken ct)
    {
        var opReviews = db.Reviews.Where(r => r.OperatorId == operatorId && r.Status == ReviewStatus.Published);
        var op = await db.Operators.FindAsync([operatorId], ct);
        if (op is not null)
        {
            op.ReviewsCount = await opReviews.CountAsync(ct);
            op.Rating = op.ReviewsCount == 0 ? 0 : Math.Round((decimal)await opReviews.AverageAsync(r => r.Rating, ct), 2);
        }
        if (tourId is { } tid && await db.Tours.FindAsync([tid], ct) is { } tour)
        {
            var tr = db.Reviews.Where(r => r.TourId == tid && r.Status == ReviewStatus.Published);
            tour.ReviewsCount = await tr.CountAsync(ct);
            tour.Rating = tour.ReviewsCount == 0 ? 0 : Math.Round((decimal)await tr.AverageAsync(r => r.Rating, ct), 2);
        }
    }

    /// <summary>Фоновые переходы: автоотмена без ответа 72 ч и завершение после даты окончания (п. 2.7).</summary>
    public async Task<int> RunScheduledTransitionsAsync(CancellationToken ct)
    {
        var deadline = clock.GetUtcNow().UtcDateTime.AddHours(-72);
        var stale = await Full.Where(b => (b.Status == BookingStatus.New || b.Status == BookingStatus.InReview) && b.CreatedAt < deadline).ToListAsync(ct);
        foreach (var b in stale)
        {
            BookingStateMachine.Move(b, BookingStatus.Cancelled, null, "Автоматическая отмена: оператор не ответил за 72 часа");
            notify.Notify(b.User, "Заявка отменена", "Оператор не ответил за 72 часа, заявка отменена автоматически. Попробуйте выбрать другого оператора.", $"/account/bookings/{b.Id}");
        }
        var today = Today;
        var finished = await Full.Where(b => b.Status == BookingStatus.Confirmed && b.EndDate < today).ToListAsync(ct);
        foreach (var b in finished)
        {
            BookingStateMachine.Move(b, BookingStatus.Completed, null, "Поездка завершена");
            notify.Notify(b.User, "Как прошла поездка?", "Поездка завершена. Оставьте отзыв — он поможет другим путешественникам.", $"/account/bookings/{b.Id}");
        }
        await db.SaveChangesAsync(ct);
        return stale.Count + finished.Count;
    }
}

public class BookingScheduler(IServiceScopeFactory scopes, ILogger<BookingScheduler> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var n = await scope.ServiceProvider.GetRequiredService<BookingService>().RunScheduledTransitionsAsync(ct);
                if (n > 0) log.LogInformation("Фоновое задание обновило статусы {Count} заявок", n);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Ошибка фонового задания заявок");
            }
        } while (await timer.WaitForNextTickAsync(ct));
    }
}
