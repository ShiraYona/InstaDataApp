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

    /// <summary>סוג החישוב עצמו — נטען לשליפה בלבד, לא נשמר בטבלה</summary>
    public CalculationTypeDefinition? CalculationType { get; set; }

    /// <summary>השדה שעליו תבוצע סכימה — רלוונטי ל-SUM</summary>
    public int? SumFieldID { get; set; }

    /// <summary>השדה שלפיו יתבצע קיבוץ — null משמעו ללא קיבוץ</summary>
    public int? GroupFieldID { get; set; }

    /// <summary>טקסט התקופה שמוצג למשתמש (CTRL_CalculationDays.Name)</summary>
    public string DateRangeType { get; set; } = string.Empty;

    /// <summary>קוד הסמל — CTRL_ICON.Name</summary>
    public string? IconCode { get; set; }

    /// <summary>האם להציג את הנתון בלוח הבקרה</summary>
    public bool IsActive { get; set; } = true;

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
    public int MetricID { get; set; }

    public Metric Metric { get; set; } = null!;

    public int FieldID { get; set; }

    public int DisplayOrder { get; set; }
}
