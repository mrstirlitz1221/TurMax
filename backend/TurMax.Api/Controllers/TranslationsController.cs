using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TurMax.Api.Data;
using TurMax.Api.Entities;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Ведение переводов контента администратором (табл. 1.3: «ведение справочников и переводов»).</summary>
[ApiController]
[Route("api/admin/translations")]
[Authorize(Roles = Roles.Admin)]
public class TranslationsController(AppDbContext db, AuditService audit) : ControllerBase
{
    public record FieldDto(string Field, string Source, string? Value);
    public record TranslationDto(string EntityType, string EntityId, string Lang, IReadOnlyList<FieldDto> Fields);
    public record SaveRequest(Dictionary<string, string?> Values);

    static readonly Dictionary<string, string> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        ["destinations"] = TranslationService.Destination, ["poi"] = TranslationService.Poi, ["tours"] = TranslationService.Tour,
        ["articles"] = TranslationService.Article, ["categories"] = TranslationService.Category, ["regions"] = TranslationService.Region,
        ["operators"] = TranslationService.Operator,
    };

    /// <summary>Исходные русские значения полей сущности.</summary>
    async Task<Dictionary<string, string>> SourceAsync(string type, string id, CancellationToken ct)
    {
        Guid.TryParse(id, out var g);
        int.TryParse(id, out var n);
        Dictionary<string, string>? r = type switch
        {
            TranslationService.Destination => await db.Destinations.FindAsync([g], ct) is { } x
                ? new() { ["Name"] = x.Name, ["Tagline"] = x.Tagline, ["Summary"] = x.Summary, ["Description"] = x.Description, ["BestTime"] = x.BestTime ?? "", ["Highlights"] = x.Highlights } : null,
            TranslationService.Poi => await db.Pois.FindAsync([g], ct) is { } x
                ? new() { ["Name"] = x.Name, ["Summary"] = x.Summary, ["Description"] = x.Description, ["Season"] = x.Season ?? "" } : null,
            TranslationService.Tour => await db.Tours.FindAsync([g], ct) is { } x
                ? new() { ["Title"] = x.Title, ["Summary"] = x.Summary, ["Description"] = x.Description, ["Recommendations"] = x.Recommendations, ["Includes"] = x.Includes } : null,
            TranslationService.Article => await db.Articles.FindAsync([g], ct) is { } x
                ? new() { ["Title"] = x.Title, ["Lead"] = x.Lead, ["Body"] = x.Body, ["Topic"] = x.Topic, ["AuthorName"] = x.AuthorName } : null,
            TranslationService.Category => await db.Categories.FindAsync([n], ct) is { } x
                ? new() { ["Name"] = x.Name, ["Tagline"] = x.Tagline, ["Description"] = x.Description } : null,
            TranslationService.Region => await db.Regions.FindAsync([n], ct) is { } x
                ? new() { ["Name"] = x.Name, ["Center"] = x.Center ?? "" } : null,
            TranslationService.Operator => await db.Operators.FindAsync([g], ct) is { } x
                ? new() { ["Name"] = x.Name, ["Description"] = x.Description } : null,
            _ => null
        };
        return r ?? throw AppException.NotFound();
    }

    static (string type, string lang) Parse(string kind, string lang)
    {
        if (!Types.TryGetValue(kind, out var type)) throw AppException.NotFound();
        var l = Langs.Normalize(lang);
        if (l == Langs.Ru) throw AppException.BadRequest("Русский — исходный язык, его правят в основной форме");
        return (type, l);
    }

    [HttpGet("{kind}/{id}/{lang}")]
    public async Task<TranslationDto> Get(string kind, string id, string lang, CancellationToken ct)
    {
        var (type, l) = Parse(kind, lang);
        id = id.ToLowerInvariant();
        var src = await SourceAsync(type, id, ct);
        var values = await db.Translations.Where(t => t.EntityType == type && t.EntityId == id && t.Lang == l).ToDictionaryAsync(t => t.Field, t => t.Value, ct);
        return new TranslationDto(type, id, l, TranslationService.Fields[type].Select(f => new FieldDto(f, src.GetValueOrDefault(f, ""), values.GetValueOrDefault(f))).ToList());
    }

    [HttpPut("{kind}/{id}/{lang}")]
    public async Task<TranslationDto> Save(string kind, string id, string lang, SaveRequest req, CancellationToken ct)
    {
        var (type, l) = Parse(kind, lang);
        id = id.ToLowerInvariant();
        await SourceAsync(type, id, ct); // проверка существования
        var existing = await db.Translations.Where(t => t.EntityType == type && t.EntityId == id && t.Lang == l).ToListAsync(ct);
        foreach (var field in TranslationService.Fields[type])
        {
            if (!req.Values.TryGetValue(field, out var value)) continue;
            var row = existing.FirstOrDefault(t => t.Field == field);
            if (string.IsNullOrWhiteSpace(value))
            {
                if (row is not null) db.Translations.Remove(row);
            }
            else if (row is null) db.Translations.Add(new Translation { EntityType = type, EntityId = id, Field = field, Lang = l, Value = value.Trim() });
            else row.Value = value.Trim();
        }
        audit.Log("admin.translation_saved", type, id, l);
        await db.SaveChangesAsync(ct);
        return await Get(kind, id, lang, ct);
    }
}
