using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using TurMax.Api.Data;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// ---------- Конфигурация и секреты ----------
var jwt = cfg.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || Encoding.UTF8.GetByteCount(jwt.Key) < 32)
    throw new InvalidOperationException("Не задан ключ подписи JWT (Jwt:Key, не короче 32 байт). Задайте его через dotnet user-secrets или переменную окружения Jwt__Key.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton(cfg.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions());
QuestPDF.Settings.License = LicenseType.Community;

// ---------- Данные ----------
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cfg.GetConnectionString("Default"),
    // Без автоматических повторов: операции с местами выполняются в явных транзакциях (п. 2.7).
    sql => sql.UseQuerySplittingBehavior(QuerySplittingBehavior.SingleQuery)));
builder.Services.AddScoped<DbSeeder>();

// ---------- Сервисы предметной области ----------
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddSingleton(Channel.CreateBounded<EmailMessage>(new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.DropOldest }));
builder.Services.AddScoped<NotificationService>();
builder.Services.AddHostedService<EmailSenderWorker>();
builder.Services.AddHttpClient<OsrmRoutingProvider>(c =>
{
    var url = cfg["Routing:OsrmBaseUrl"];
    if (!string.IsNullOrWhiteSpace(url)) c.BaseAddress = new Uri(url.TrimEnd('/') + "/");
    c.Timeout = TimeSpan.FromSeconds(6);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("TurMax/1.0");
});
builder.Services.AddSingleton<HaversineRoutingProvider>();
builder.Services.AddScoped<RoutingService>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<RouteService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddHostedService<BookingScheduler>();

// ---------- HTTP ----------
builder.Services.AddControllers(o => o.Filters.Add<AppExceptionFilter>())
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        o.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All);
    })
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ErrorHandling.InvalidModel);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = jwt.Issuer, ValidAudience = jwt.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        RoleClaimType = System.Security.Claims.ClaimTypes.Role, NameClaimType = "name"
    };
});
builder.Services.AddAuthorization();

// Ограничение частоты попыток входа и регистрации (OWASP A07).
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

var origins = cfg.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "TurMax API", Version = "v1", Description = "REST API туристического портала Кыргызстана «ТурМакс»" });
    var xml = Path.Combine(AppContext.BaseDirectory, "TurMax.Api.xml");
    if (File.Exists(xml)) o.IncludeXmlComments(xml);
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
        Description = "Access-токен из /api/auth/login"
    });
    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
    o.MapType<DateOnly>(() => new OpenApiSchema { Type = "string", Format = "date" });
});

var app = builder.Build();

// ---------- Миграции и начальные данные ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (cfg.GetValue("Database:MigrateOnStartup", true)) await db.Database.MigrateAsync();
    if (cfg.GetValue("Database:SeedOnStartup", true)) await scope.ServiceProvider.GetRequiredService<DbSeeder>().SeedAsync();
}

app.UseApiErrorHandling();
app.Use(async (ctx, next) =>
{
    // Заголовки безопасности (OWASP A05).
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";
    h["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});
if (!app.Environment.IsDevelopment()) app.UseHsts();

app.UseSwagger();
app.UseSwaggerUI(o => o.DocumentTitle = "TurMax API");
app.UseStaticFiles(); // /uploads/*
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();

app.Run();

public partial class Program;
