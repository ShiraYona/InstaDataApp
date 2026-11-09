namespace InstaDataApp.Domain.Entities;

/// <summary>
/// נתון שהוגדר ע"י בעל הרשאת ניהול נתונים.
/// ממופה לטבלה הקיימת CTRL_Metrics — לקריאה בלבד.
/// </summary>
public class Metric
{
    public int MetricId { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public string? IconCode { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }

    public string MetricName { get; set; } = string.Empty;

    public int SourceId { get; set; }

    /// <summary>DIRECT / SUM / COUNT — נאכף ב-DB באמצעות CHECK constraint</summary>
    public string CalculationType { get; set; } = string.Empty;

    /// <summary>שדה הסכום — רלוונטי רק ל-SUM</summary>
    public int? SumFieldId { get; set; }

    /// <summary>שדה הקיבוץ — אופציונלי</summary>
    public int? GroupFieldId { get; set; }

    /// <summary>DAY / MONTH / YEAR</summary>
    public string DateRangeType { get; set; } = string.Empty;

    public string? IconCode { get; set; }

    public bool IsActive { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }

    /// <summary>timestamp rowversion — EF משתמש בו לזיהוי התנגשות עדכון</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
