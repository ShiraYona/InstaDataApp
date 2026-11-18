using InstaDataApp.Application.Common.Models;
using System.Globalization;
using System.Text;

namespace InstaDataApp.Web.Services;

/// <summary>
/// בניית קובץ CSV לייצוא רשומות הפירוט.
/// • כותרות בעברית (תווית השדה כפי שמוצג בפירוט)
/// • UTF-8 עם BOM — כדי שאקסל יציג עברית כראוי
/// • ערכי תאריך ומספר מפורמטים כמו בתצוגה
/// • הגנה מפני CSV Injection: תא שטקסט מתחיל ב-=, +, @, TAB יוקדם בגרש.
///   ערך שלילי שנראה כמספר נשאר כמספר, כדי לא לשבש כמויות.
/// </summary>
public static class DetailCsvBuilder
{
    private const string Delimiter = ",";
    private static readonly CultureInfo He = CultureInfo.GetCultureInfo("he-IL");

    public static byte[] Build(MetricDetailDto detail)
    {
        var columns = detail.Columns;
        var sb = new StringBuilder();

        sb.Append(string.Join(Delimiter, columns.Select(c => Escape(c.Label, isHeader: true)))).Append("\r\n");

        foreach (var record in detail.Records)
        {
            var cells = columns.Select(c =>
                Escape(Format(record.TryGetValue(c.FieldName, out var v) ? v : null, c.DataType), isHeader: false));
            sb.Append(string.Join(Delimiter, cells)).Append("\r\n");
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(sb.ToString());
        var result = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, result, preamble.Length, body.Length);
        return result;
    }

    public static string FileName(MetricDetailDto detail, string key)
    {
        var baseName = string.IsNullOrWhiteSpace(detail.Title) ? $"metric-{key}" : detail.Title;
        foreach (var ch in Path.GetInvalidFileNameChars()) baseName = baseName.Replace(ch, '_');
        return $"{baseName}_{DateTime.Now:yyyyMMdd_HHmm}.csv";
    }

    private static string Format(object? value, string type)
    {
        if (value is null || value is DBNull) return string.Empty;

        switch (type?.ToLowerInvariant())
        {
            case "date":
            case "datetime":
                if (value is DateTime dt) return dt.ToString("dd/MM/yyyy", He);
                if (DateTime.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture),
                        CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                    return parsed.ToString("dd/MM/yyyy", He);
                break;

            case "number":
            case "decimal":
            case "int":
            case "float":
            case "money":
                if (decimal.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture),
                        NumberStyles.Any, CultureInfo.InvariantCulture, out var num))
                    return num.ToString("N2", He);
                break;
        }

        return Convert.ToString(value, He) ?? string.Empty;
    }

    private static string Escape(string? value, bool isHeader)
    {
        value ??= string.Empty;

        if (value.Length > 0 && value[0] is '=' or '+' or '@' or '\t' or '\r')
            value = "'" + value;
        else if (!isHeader && value.Length > 0 && value[0] == '-' && !decimal.TryParse(value, out _))
            value = "'" + value;

        if (value.Contains('"') || value.Contains(Delimiter) || value.Contains('\n') || value.Contains('\r'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";

        return value;
    }
}
