using System.Net;
using System.Net.Mail;
using System.Threading.Channels;
using TurMax.Api.Data;
using TurMax.Api.Entities;

namespace TurMax.Api.Services;

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public string From { get; set; } = "no-reply@turmax.kg";
    public bool EnableSsl { get; set; } = true;
}

public record EmailMessage(string To, string Subject, string Body);

/// <summary>
/// Уведомления о смене статуса заявки (FR-12): запись в кабинете пользователя и письмо.
/// Письма уходят асинхронно через очередь, чтобы задержка SMTP не увеличивала время ответа (п. 2.7).
/// </summary>
public class NotificationService(AppDbContext db, Channel<EmailMessage> queue)
{
    public void Notify(User user, string title, string body, string? link)
    {
        db.Notifications.Add(new Notification { UserId = user.Id, Title = title, Body = body, Link = link });
        queue.Writer.TryWrite(new EmailMessage(user.Email, $"TurMax: {title}", body));
    }
}

public class EmailSenderWorker(Channel<EmailMessage> queue, SmtpOptions opt, ILogger<EmailSenderWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var msg in queue.Reader.ReadAllAsync(ct))
        {
            if (string.IsNullOrWhiteSpace(opt.Host))
            {
                log.LogInformation("SMTP не настроен — письмо не отправлено: {Subject} → {To}", msg.Subject, msg.To);
                continue;
            }
            try
            {
                using var client = new SmtpClient(opt.Host, opt.Port) { EnableSsl = opt.EnableSsl };
                if (!string.IsNullOrEmpty(opt.User)) client.Credentials = new NetworkCredential(opt.User, opt.Password);
                await client.SendMailAsync(new MailMessage(opt.From, msg.To, msg.Subject, msg.Body), ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Не удалось отправить письмо {To}", msg.To);
            }
        }
    }
}
