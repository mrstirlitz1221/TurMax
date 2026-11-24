using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurMax.Api.Infrastructure;
using TurMax.Api.Services;

namespace TurMax.Api.Controllers;

/// <summary>Загрузка изображений: файл сохраняется на диск, в БД хранится только ссылка и метаданные.</summary>
[ApiController]
[Route("api/uploads")]
[Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
public class UploadsController(IWebHostEnvironment env, AuditService audit, Data.AppDbContext db) : ControllerBase
{
    const long MaxBytes = 8 * 1024 * 1024;
    static readonly Dictionary<string, byte[][]> Signatures = new()
    {
        [".jpg"] = [[0xFF, 0xD8, 0xFF]],
        [".png"] = [[0x89, 0x50, 0x4E, 0x47]],
        [".webp"] = [[0x52, 0x49, 0x46, 0x46]],
    };

    [HttpPost]
    [RequestSizeLimit(MaxBytes + 1024 * 64)]
    public async Task<ActionResult<object>> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) throw AppException.BadRequest("Файл не выбран");
        if (file.Length > MaxBytes) throw AppException.BadRequest("Размер файла — не более 8 МБ");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext == ".jpeg") ext = ".jpg";
        if (!Signatures.TryGetValue(ext, out var sigs)) throw AppException.BadRequest("Допустимые форматы: JPG, PNG, WebP");

        // Проверяем сигнатуру файла, а не только расширение.
        var head = new byte[8];
        await using (var s = file.OpenReadStream()) _ = await s.ReadAsync(head, ct);
        if (!sigs.Any(sig => head.Take(sig.Length).SequenceEqual(sig))) throw AppException.BadRequest("Содержимое файла не соответствует формату изображения");

        var folder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", DateTime.UtcNow.ToString("yyyyMM"));
        Directory.CreateDirectory(folder);
        var name = $"{Guid.NewGuid():N}{ext}";
        await using (var fs = System.IO.File.Create(Path.Combine(folder, name))) await file.CopyToAsync(fs, ct);
        var url = $"/uploads/{DateTime.UtcNow:yyyyMM}/{name}";
        audit.Log("upload.image", "Upload", null, url);
        await db.SaveChangesAsync(ct);
        return Created(url, new { url });
    }
}
