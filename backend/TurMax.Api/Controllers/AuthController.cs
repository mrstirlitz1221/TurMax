using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Dtos;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Модуль Auth: регистрация, вход, обновление и отзыв токенов (FR-04).</summary>
[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens, JwtOptions jwt, IPasswordHasher<User> hasher, AuditService audit) : ControllerBase
{
    const string RefreshCookie = "turmax_refresh";

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, ct)) throw AppException.Conflict("Пользователь с таким e-mail уже зарегистрирован");
        var isOperator = req.AccountType == "operator";
        if (isOperator && string.IsNullOrWhiteSpace(req.CompanyName)) throw AppException.BadRequest("Укажите название компании");

        var user = new User
        {
            Email = email, FullName = req.FullName.Trim(), Phone = req.Phone?.Trim(), ConsentAt = DateTime.UtcNow,
            Role = isOperator ? UserRole.Operator : UserRole.Tourist
        };
        user.PasswordHash = hasher.HashPassword(user, req.Password);
        db.Users.Add(user);
        if (isOperator)
        {
            var name = req.CompanyName!.Trim();
            var slug = Text.Slugify(name);
            if (await db.Operators.AnyAsync(o => o.Slug == slug, ct)) slug += "-" + Guid.NewGuid().ToString("N")[..6];
            // Оператор начинает в статусе «на проверке»: туры станут публичными после верификации администратором.
            db.Operators.Add(new Operator { UserId = user.Id, Name = name, Slug = slug, Kind = req.OperatorKind ?? OperatorKind.TourOperator, Email = email, Phone = user.Phone });
        }
        audit.Log("auth.register", "User", user.Id, user.Role.ToString(), user.Id, email);
        await db.SaveChangesAsync(ct);
        return await IssueAsync(user, ct);
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        var ok = user is not null && hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) != PasswordVerificationResult.Failed;
        if (!ok)
        {
            audit.Log("auth.login_failed", "User", user?.Id, null, user?.Id, email);
            await db.SaveChangesAsync(ct);
            throw new AppException(401, "Неверный e-mail или пароль");
        }
        if (user!.IsBlocked) throw AppException.Forbidden("Учётная запись заблокирована");
        return await IssueAsync(user, ct);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookie];
        // Нет cookie — гость без сессии: это не ошибка, клиенту просто нечего обновлять.
        if (string.IsNullOrEmpty(raw)) return NoContent();
        var hash = TokenService.Hash(raw);
        var rt = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (rt is null || rt.RevokedAt is not null || rt.ExpiresAt < DateTime.UtcNow || rt.User.IsBlocked)
        {
            Response.Cookies.Delete(RefreshCookie, CookieOpts(DateTime.UnixEpoch));
            throw new AppException(401, "Сессия истекла");
        }
        rt.RevokedAt = DateTime.UtcNow; // ротация: каждый refresh-токен одноразовый
        return await IssueAsync(rt.User, ct);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var raw = Request.Cookies[RefreshCookie];
        if (!string.IsNullOrEmpty(raw))
        {
            var hash = TokenService.Hash(raw);
            await db.RefreshTokens.Where(t => t.TokenHash == hash && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);
        }
        Response.Cookies.Delete(RefreshCookie, CookieOpts(DateTime.UnixEpoch));
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var u = await db.Users.Include(x => x.Operator).FirstOrDefaultAsync(x => x.Id == User.UserId(), ct) ?? throw new AppException(401, "Требуется вход");
        return ToDto(u);
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateMe(UpdateProfileRequest req, CancellationToken ct)
    {
        var u = await db.Users.Include(x => x.Operator).FirstAsync(x => x.Id == User.UserId(), ct);
        u.FullName = req.FullName.Trim();
        u.Phone = req.Phone?.Trim();
        await db.SaveChangesAsync(ct);
        return ToDto(u);
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var u = await db.Users.FirstAsync(x => x.Id == User.UserId(), ct);
        if (hasher.VerifyHashedPassword(u, u.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            throw AppException.BadRequest("Текущий пароль указан неверно");
        u.PasswordHash = hasher.HashPassword(u, req.NewPassword);
        await db.RefreshTokens.Where(t => t.UserId == u.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, DateTime.UtcNow), ct);
        audit.Log("auth.password_changed", "User", u.Id);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Удаление учётной записи: персональные данные обезличиваются (п. 2.9).</summary>
    [Authorize(Roles = Roles.Tourist)]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMe(CancellationToken ct)
    {
        var u = await db.Users.FirstAsync(x => x.Id == User.UserId(), ct);
        var active = await db.Bookings.AnyAsync(b => b.UserId == u.Id &&
            (b.Status == BookingStatus.New || b.Status == BookingStatus.InReview || b.Status == BookingStatus.PriceChanged || b.Status == BookingStatus.Confirmed), ct);
        if (active) throw AppException.Conflict("Сначала отмените или завершите активные заявки");
        u.Email = $"deleted-{u.Id:N}@deleted.local";
        u.FullName = "Удалённый пользователь";
        u.Phone = null;
        u.IsBlocked = true;
        u.PasswordHash = "";
        await db.Bookings.Where(b => b.UserId == u.Id).ExecuteUpdateAsync(s => s.SetProperty(b => b.ContactPhone, "—").SetProperty(b => b.Comment, (string?)null), ct);
        await db.RefreshTokens.Where(t => t.UserId == u.Id).ExecuteDeleteAsync(ct);
        db.Favorites.RemoveRange(db.Favorites.Where(f => f.UserId == u.Id));
        audit.Log("auth.account_deleted", "User", u.Id);
        await db.SaveChangesAsync(ct);
        Response.Cookies.Delete(RefreshCookie, CookieOpts(DateTime.UnixEpoch));
        return NoContent();
    }

    async Task<AuthResponse> IssueAsync(User user, CancellationToken ct)
    {
        var op = await db.Operators.FirstOrDefaultAsync(o => o.UserId == user.Id, ct);
        user.Operator = op;
        var (access, expires) = tokens.CreateAccessToken(user, op?.Id);
        var refresh = TokenService.NewRefreshToken();
        var refreshExpires = DateTime.UtcNow.AddDays(jwt.RefreshDays);
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = TokenService.Hash(refresh), ExpiresAt = refreshExpires });
        await db.SaveChangesAsync(ct);
        Response.Cookies.Append(RefreshCookie, refresh, CookieOpts(refreshExpires));
        return new AuthResponse(access, expires, ToDto(user));
    }

    static CookieOptions CookieOpts(DateTime expires) => new()
    {
        HttpOnly = true, Secure = true, SameSite = SameSiteMode.Strict, Path = "/api/auth", Expires = expires
    };

    static UserDto ToDto(User u) => new(u.Id, u.Email, u.FullName, u.Phone, u.Role.ToString(), u.Operator?.Id, u.Operator?.Name, u.Operator?.Verification);
}
