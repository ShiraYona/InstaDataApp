namespace InstaDataApp.Domain.Entities;

/// <summary>
/// נתון מוגדר — טבלת CTRL_Metrics.
/// </summary>
public class Metric
{
    public int MetricID { get; set; }

    public string MetricName { get; set; } = string.Empty;

    public int SourceID { get; set; }

    public DataSource Source { get; set; } = null!;

    /// <summary>מפתח ל-CTRL_CalculationTypes (COUNT / SUM / DIRECT)</summary>
    public int CalculationTypeID { get; set; }

    /// <summary>השדה שעליו תבוצע סכימה — רלוונטי ל-SUM</summary>
    public int? SumFieldID { get; set; }

    /// <summary>השדה שלפיו יתבצע קיבוץ — null משמעו ללא קיבוץ</summary>
    public int? GroupFieldID { get; set; }

    /// <summary>DIRECT / SUM / COUNT — נאכף ב-DB באמצעות CHECK constraint</summary>
    public string CalculationType { get; set; } = string.Empty;

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
