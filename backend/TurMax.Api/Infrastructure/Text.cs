using System.Text;
using System.Text.RegularExpressions;

namespace TurMax.Api.Infrastructure;

public static partial class Text
{
    static readonly Dictionary<char, string> Map = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['д'] = "d", ['е'] = "e", ['ё'] = "e", ['ж'] = "zh", ['з'] = "z",
        ['и'] = "i", ['й'] = "y", ['к'] = "k", ['л'] = "l", ['м'] = "m", ['н'] = "n", ['ң'] = "n", ['о'] = "o", ['ө'] = "o", ['п'] = "p",
        ['р'] = "r", ['с'] = "s", ['т'] = "t", ['у'] = "u", ['ү'] = "u", ['ф'] = "f", ['х'] = "h", ['ц'] = "ts", ['ч'] = "ch",
        ['ш'] = "sh", ['щ'] = "sch", ['ъ'] = "", ['ы'] = "y", ['ь'] = "", ['э'] = "e", ['ю'] = "yu", ['я'] = "ya"
    };

    /// <summary>Человекочитаемый адрес (slug) из русского названия.</summary>
    public static string Slugify(string s)
    {
        var sb = new StringBuilder();
        foreach (var ch in s.ToLowerInvariant())
            sb.Append(Map.TryGetValue(ch, out var r) ? r : char.IsLetterOrDigit(ch) && ch < 128 ? ch.ToString() : "-");
        var slug = DashRun().Replace(sb.ToString(), "-").Trim('-');
        return slug.Length > 80 ? slug[..80].Trim('-') : slug;
    }

    [GeneratedRegex("-{2,}")]
    private static partial Regex DashRun();
}
