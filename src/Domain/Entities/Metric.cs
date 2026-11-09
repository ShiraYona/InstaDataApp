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

    /// <summary>תקופת החישוב — הערך הוא התווית שנשמרה מהרשימה</summary>
    public string DateRangeType { get; set; } = string.Empty;

    /// <summary>סמל הכרטיס (IconCode)</summary>
    public string? IconCode { get; set; }

    public bool IsActive { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }

    /// <summary>מנוהל על ידי המסד — לא נכתב מהאפליקציה</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public List<MetricDetailField> DetailFields { get; set; } = new();
}

/// <summary>
/// שדה פירוט של נתון מוגדר — טבלת CTRL_MetricDetailFields.
/// </summary>
public class MetricDetailField
{
    public int MetricID { get; set; }

    public Metric Metric { get; set; } = null!;

    public int FieldID { get; set; }

    public int DisplayOrder { get; set; }
}
