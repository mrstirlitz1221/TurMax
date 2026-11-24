using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TurMax.Api.Entities;

namespace TurMax.Api.Infrastructure;

public class JwtOptions
{
    public string Issuer { get; set; } = "TurMax";
    public string Audience { get; set; } = "TurMax";
    /// <summary>Секретный ключ подписи — задаётся через User Secrets / переменную окружения Jwt__Key.</summary>
    public string Key { get; set; } = "";
    public int AccessMinutes { get; set; } = 15;
    public int RefreshDays { get; set; } = 30;
}

public static class Roles
{
    public const string Tourist = nameof(UserRole.Tourist);
    public const string Operator = nameof(UserRole.Operator);
    public const string Admin = nameof(UserRole.Admin);
}

public class TokenService(JwtOptions opt)
{
    public (string token, DateTime expires) CreateAccessToken(User u, Guid? operatorId)
    {
        var expires = DateTime.UtcNow.AddMinutes(opt.AccessMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, u.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, u.Email),
            new(ClaimTypes.Role, u.Role.ToString()),
            new("name", u.FullName),
        };
        if (operatorId is { } oid) claims.Add(new Claim("operator_id", oid.ToString()));
        var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opt.Key)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(opt.Issuer, opt.Audience, claims, expires: expires, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    public static string NewRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));

    public static string Hash(string token) => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}

public static class ClaimsExtensions
{
    public static Guid UserId(this ClaimsPrincipal p)
        => Guid.TryParse(p.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? p.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id : throw new AppException(401, "Требуется вход в систему");

    public static Guid? UserIdOrNull(this ClaimsPrincipal p)
        => p.Identity?.IsAuthenticated == true ? p.UserId() : null;

    public static Guid OperatorId(this ClaimsPrincipal p)
        => Guid.TryParse(p.FindFirstValue("operator_id"), out var id) ? id : throw AppException.Forbidden("Профиль оператора не найден");
}
