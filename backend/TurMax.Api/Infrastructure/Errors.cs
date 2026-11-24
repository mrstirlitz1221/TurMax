using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace TurMax.Api.Infrastructure;

/// <summary>Ошибка бизнес-логики с HTTP-кодом (400, 403, 404, 409).</summary>
public class AppException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    public static AppException NotFound(string what = "Объект не найден") => new(404, what);
    public static AppException Forbidden(string msg = "Недостаточно прав") => new(403, msg);
    public static AppException Conflict(string msg) => new(409, msg);
    public static AppException BadRequest(string msg) => new(400, msg);
}

/// <summary>Единый формат ответа об ошибке (п. 2.5): statusCode, error, message.</summary>
public record ErrorResponse(int StatusCode, string Error, string Message, IDictionary<string, string[]>? Details = null);

/// <summary>Преобразует ожидаемые бизнес-ошибки в ответ без записи в журнал как «необработанных».</summary>
public class AppExceptionFilter : Microsoft.AspNetCore.Mvc.Filters.IExceptionFilter
{
    public void OnException(Microsoft.AspNetCore.Mvc.Filters.ExceptionContext context)
    {
        if (context.Exception is not AppException ex) return;
        context.Result = new ObjectResult(ErrorHandling.Create(ex.StatusCode, ex.Message)) { StatusCode = ex.StatusCode };
        context.ExceptionHandled = true;
    }
}

public static class ErrorHandling
{
    static string Name(int code) => code switch
    {
        400 => "Bad Request", 401 => "Unauthorized", 403 => "Forbidden", 404 => "Not Found",
        409 => "Conflict", 429 => "Too Many Requests", _ => "Internal Server Error"
    };

    public static ErrorResponse Create(int code, string message, IDictionary<string, string[]>? details = null)
        => new(code, Name(code), message, details);

    public static void UseApiErrorHandling(this WebApplication app)
    {
        app.UseExceptionHandler(builder => builder.Run(async ctx =>
        {
            var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
            var (code, msg) = ex switch
            {
                AppException a => (a.StatusCode, a.Message),
                BadHttpRequestException b => (400, b.Message),
                _ => (500, "Внутренняя ошибка сервера")
            };
            if (code == 500)
                ctx.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Errors").LogError(ex, "Unhandled error");
            ctx.Response.StatusCode = code;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(Create(code, msg), JsonOptions));
        }));

        app.UseStatusCodePages(async sc =>
        {
            var r = sc.HttpContext.Response;
            if (r.HasStarted || r.ContentLength > 0 || !string.IsNullOrEmpty(r.ContentType)) return;
            var msg = r.StatusCode switch
            {
                401 => "Требуется вход в систему",
                403 => "Недостаточно прав",
                404 => "Ресурс не найден",
                429 => "Слишком много попыток. Повторите позже",
                _ => "Ошибка запроса"
            };
            r.ContentType = "application/json";
            await r.WriteAsync(JsonSerializer.Serialize(Create(r.StatusCode, msg), JsonOptions));
        });
    }

    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Create(System.Text.Unicode.UnicodeRanges.All)
    };

    /// <summary>Ответ на ошибки валидации DTO в том же формате.</summary>
    public static IActionResult InvalidModel(ActionContext ctx)
    {
        var details = ctx.ModelState.Where(kv => kv.Value?.Errors.Count > 0)
            .ToDictionary(kv => JsonNamingPolicy.CamelCase.ConvertName(kv.Key),
                          kv => kv.Value!.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage) ? "Неверное значение" : e.ErrorMessage).ToArray());
        var first = details.Values.SelectMany(v => v).FirstOrDefault() ?? "Ошибка валидации";
        return new BadRequestObjectResult(Create(400, first, details));
    }
}
