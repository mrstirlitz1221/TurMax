using System.Security.Claims;
using TurMax.Api.Data;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;

namespace TurMax.Api.Services;

/// <summary>Журнал действий операторов и администраторов (FR-20, OWASP A09).</summary>
public class AuditService(AppDbContext db, IHttpContextAccessor http)
{
    /// <summary>Добавляет запись в журнал; сохраняется вместе с остальными изменениями в SaveChanges.</summary>
    public void Log(string action, string entityType, object? entityId = null, string? details = null, Guid? userId = null, string? email = null)
    {
        var ctx = http.HttpContext;
        var user = ctx?.User;
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId ?? user?.UserIdOrNull(),
            UserEmail = email ?? user?.FindFirst(ClaimTypes.Email)?.Value ?? user?.FindFirst("email")?.Value,
            Action = action,
            EntityType = entityType,
            EntityId = entityId?.ToString(),
            Details = details is { Length: > 2000 } ? details[..2000] : details,
            Ip = ctx?.Connection.RemoteIpAddress?.ToString()
        });
    }
}
