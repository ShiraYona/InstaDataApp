using System.ComponentModel.DataAnnotations.Schema;

namespace InstaDataApp.Domain.Entities;

/// <summary>
/// נתון שהוגדר ע"י בעל הרשאת ניהול נתונים.
/// ממופה לטבלה הקיימת CTRL_Metrics.
/// </summary>
public class Metric
{
    public int MetricId { get; set; }

    public string MetricName { get; set; } = string.Empty;

    public int SourceID { get; set; }

    public DataSource Source { get; set; } = null!;

    /// <summary>מפתח ל-CTRL_CalculationTypes (COUNT / SUM / DIRECT)</summary>
    public int CalculationTypeID { get; set; }

    /// <summary>השדה שעליו תבוצע סכימה — רלוונטי ל-SUM</summary>
    public int? SumFieldID { get; set; }

    /// <summary>השדה שלפיו יתבצע קיבוץ — null משמעו ללא קיבוץ</summary>
    public int? GroupFieldID { get; set; }

    /// <summary>מזהה סוג החישוב — מפתח זר ל-<c>CTRL_CalculationTypes</c></summary>
    public int CalculationTypeId { get; set; }

    /// <summary>שם סוג החישוב לתצוגה — נטען ב-JOIN, לא נשמר בטבלה</summary>
    [NotMapped]
    public string? CalculationTypeName { get; set; }

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

    public List<MetricDetailField> DetailFields { get; set; } = new();

    /// <summary>timestamp rowversion — EF משתמש בו לזיהוי התנגשות עדכון</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}

/// <summary>
/// שדה פירוט של נתון מוגדר — טבלת CTRL_MetricDetailFields.
/// </summary>
public class MetricDetailField
{
    public Metric Metric { get; set; } = null!;

    public int FieldID { get; set; }

    public int DisplayOrder { get; set; }
}
