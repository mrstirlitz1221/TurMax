using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;

namespace TurMax.Api.Services;

/// <summary>Допустимые переходы статусов заявки (диаграмма состояний, рис. 2.7).</summary>
public static class BookingStateMachine
{
    static readonly Dictionary<BookingStatus, BookingStatus[]> Allowed = new()
    {
        [BookingStatus.New] = [BookingStatus.InReview, BookingStatus.Cancelled],
        [BookingStatus.InReview] = [BookingStatus.Confirmed, BookingStatus.Rejected, BookingStatus.PriceChanged, BookingStatus.Cancelled],
        [BookingStatus.PriceChanged] = [BookingStatus.Confirmed, BookingStatus.Cancelled],
        [BookingStatus.Confirmed] = [BookingStatus.Completed, BookingStatus.Cancelled],
        [BookingStatus.Rejected] = [],
        [BookingStatus.Cancelled] = [],
        [BookingStatus.Completed] = [],
    };

    public static bool CanMove(BookingStatus from, BookingStatus to) => Allowed[from].Contains(to);

    /// <summary>Выполняет переход и пишет запись в историю; недопустимый переход — 409.</summary>
    public static void Move(Booking b, BookingStatus to, Guid? byUserId, string? note = null)
    {
        if (!CanMove(b.Status, to))
            throw AppException.Conflict($"Недопустимый переход статуса: {Name(b.Status)} → {Name(to)}");
        b.History.Add(new BookingHistory { BookingId = b.Id, FromStatus = b.Status, ToStatus = to, ChangedByUserId = byUserId, Note = note });
        b.Status = to;
        b.UpdatedAt = DateTime.UtcNow;
    }

    public static string Name(BookingStatus s) => s switch
    {
        BookingStatus.New => "Новая",
        BookingStatus.InReview => "На рассмотрении",
        BookingStatus.PriceChanged => "Изменена цена",
        BookingStatus.Confirmed => "Подтверждена",
        BookingStatus.Rejected => "Отклонена",
        BookingStatus.Cancelled => "Отменена",
        BookingStatus.Completed => "Завершена",
        _ => s.ToString()
    };
}
