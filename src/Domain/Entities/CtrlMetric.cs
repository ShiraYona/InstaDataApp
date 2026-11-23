namespace InstaDataApp.Domain.Entities;

/// <summary>
/// נתון מוגדר — טבלת CTRL_Metrics.
/// Model יחיד לכל שימושי המדד (יצירה, עריכה, לוח הבקרה).
/// </summary>
public class CtrlMetric
{
    public int MetricID { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public int SourceID { get; set; }
    public int CalculationTypeID { get; set; }
    public CtrlCalculationType? CalculationType { get; set; }

    /// <summary>השדה שעליו תבוצע סכימה — רלוונטי ל-SUM</summary>
    public int? SumFieldID { get; set; }

    /// <summary>השדה שלפיו יתבצע קיבוץ — null משמעו ללא קיבוץ</summary>
    public int? GroupFieldID { get; set; }
    /// <summary>
    /// תקופת החישוב — העמודה במסד היא nvarchar(20) ושומרת את הטקסט (למשל "30 ימים")
    /// או את הערך הקבוע BOARD_FILTER. לא מספר — אל תשנו ל-int.
    /// </summary>
    public string? DateRangeType { get; set; }
    public string? IconCode { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>מסננים מורכבים (JSON) — נשמר כפי שהוא, הטופס הנוכחי אינו עורך אותם</summary>
    public string? FiltersJson { get; set; }

    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }

    /// <summary>timestamp rowversion — EF משתמש בו לזיהוי התנגשות עדכון</summary>
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public ICollection<CtrlMetricDetailField> DetailFields { get; set; } = new List<CtrlMetricDetailField>();
}
