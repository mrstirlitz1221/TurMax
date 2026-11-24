using System.Globalization;
using System.Xml.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TurMax.Api.Entities;

namespace TurMax.Api.Services;

/// <summary>Модуль Export: программа маршрута в PDF и трек в GPX 1.1 (FR-10).</summary>
public static class ExportService
{
    static readonly XNamespace Gpx = "http://www.topografix.com/GPX/1/1";

    public static byte[] ToGpx(UserRoute route, EstimateResult est)
    {
        string F(decimal v) => v.ToString("0.######", CultureInfo.InvariantCulture);
        string D(double v) => v.ToString("0.######", CultureInfo.InvariantCulture);
        var points = route.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).ToList();
        var doc = new XDocument(new XDeclaration("1.0", "UTF-8", null),
            new XElement(Gpx + "gpx", new XAttribute("version", "1.1"), new XAttribute("creator", "TurMax"),
                new XElement(Gpx + "metadata", new XElement(Gpx + "name", route.Title), new XElement(Gpx + "time", DateTime.UtcNow.ToString("o"))),
                points.Select(p => new XElement(Gpx + "wpt", new XAttribute("lat", F(p.Poi.Latitude)), new XAttribute("lon", F(p.Poi.Longitude)),
                    p.Poi.AltitudeM is { } alt ? new XElement(Gpx + "ele", alt) : null,
                    new XElement(Gpx + "name", p.Poi.Name), new XElement(Gpx + "desc", $"День {p.Day}"))),
                new XElement(Gpx + "trk", new XElement(Gpx + "name", route.Title),
                    new XElement(Gpx + "trkseg", est.Geometry.Select(g => new XElement(Gpx + "trkpt", new XAttribute("lat", D(g.Lat)), new XAttribute("lon", D(g.Lng)))))))
        );
        using var ms = new MemoryStream();
        doc.Save(ms);
        return ms.ToArray();
    }

    public static byte[] ToPdf(UserRoute route, EstimateResult est, string operatorName)
    {
        var points = route.Points.OrderBy(p => p.Day).ThenBy(p => p.Order).ToList();
        string Money(decimal v) => v.ToString("N0", CultureInfo.GetCultureInfo("ru-RU")) + " сом";
        const string green = "#1F3A2E";

        return Document.Create(c => c.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(t => t.FontSize(10).FontFamily("Arial"));
            page.Header().Column(col =>
            {
                col.Item().Text("TurMax · Программа маршрута").FontSize(9).FontColor(Colors.Grey.Darken1);
                col.Item().Text(route.Title).FontSize(22).Bold().FontColor(green);
                col.Item().Text($"Участников: {route.Participants} · Дней: {est.Days} · Расстояние: ~{est.DistanceKm:0} км" +
                                (route.StartDate is { } d ? $" · Старт: {d:dd.MM.yyyy}" : "")).FontColor(Colors.Grey.Darken2);
            });
            page.Content().PaddingVertical(16).Column(col =>
            {
                col.Spacing(10);
                foreach (var day in points.GroupBy(p => p.Day))
                {
                    col.Item().Text($"День {day.Key}" + (est.DrivingHoursByDay.Count >= day.Key ? $" · в пути ~{est.DrivingHoursByDay[day.Key - 1]:0.0} ч" : ""))
                        .FontSize(13).Bold().FontColor(green);
                    foreach (var p in day)
                        col.Item().PaddingLeft(10).Text(t =>
                        {
                            t.Span(p.Poi.Name).SemiBold();
                            if (p.Poi.AltitudeM is { } alt) t.Span($"  ·  {alt} м");
                            if (p.Nights > 0) t.Span($"  ·  ночёвок: {p.Nights}");
                            t.Line("");
                            t.Span(p.Poi.Summary).FontColor(Colors.Grey.Darken2);
                        });
                }
                col.Item().PaddingTop(10).Text("Смета").FontSize(13).Bold().FontColor(green);
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(cd => { cd.RelativeColumn(3); cd.RelativeColumn(2); });
                    void Row(string a, string b, bool bold = false)
                    {
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).Text(a).Bold();
                        var cell = table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).AlignRight().Text(b);
                        if (bold) cell.Bold();
                    }
                    Row("Транспорт", Money(est.Items.Transport));
                    Row("Проживание", Money(est.Items.Lodging));
                    Row("Питание", Money(est.Items.Meals));
                    Row("Гид", Money(est.Items.Guide));
                    Row("Сборы и билеты", Money(est.Items.Fees));
                    Row($"Сезонный коэффициент / наценка оператора", $"× {est.SeasonFactor:0.00} / {est.OperatorMargin:P0}");
                    Row("Итого", Money(est.Total), true);
                    Row("На одного участника", Money(est.PerPerson), true);
                });
                col.Item().Text($"Тарифы: {operatorName}. Смета ориентировочная, итоговую цену подтверждает оператор.").FontSize(8).FontColor(Colors.Grey.Darken1);
                foreach (var w in est.Warnings) col.Item().Text("• " + w).FontSize(9).FontColor(Colors.Orange.Darken3);
            });
            page.Footer().AlignCenter().Text(t =>
            {
                t.Span("turmax · стр. ").FontSize(8).FontColor(Colors.Grey.Medium);
                t.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
            });
        })).GeneratePdf();
    }
}
