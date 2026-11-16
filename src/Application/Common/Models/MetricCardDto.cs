namespace InstaDataApp.Application.Common.Models;

/// <summary>
/// נתון שהלוח מציג. מבנה זהה ל-CubeMetric בצד ה-Angular.
/// </summary>
public class MetricCardDto
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string Source { get; set; } = string.Empty;
    /// <summary>טבלת/אובייקט המקור, למשל dbo.T1</summary>
    public string SourceObject { get; set; } = string.Empty;
    /// <summary>השדה שממנו מחושב הערך (סכום/ספירה/קיבוץ)</summary>
    public string? ValueField { get; set; }
    /// <summary>השדה שלפיו מקבצים, אם קיים</summary>
    public string? GroupField { get; set; }
    /// <summary>הכיתוב של שדה הקיבוץ לתצוגה</summary>
    public string? GroupFieldLabel { get; set; }
    /// <summary>ערך הקבוצה שהכרטיס מייצג — כל החישובים של הכרטיס הם עבור קבוצה זו</summary>
    public string? GroupValue { get; set; }
        /// <summary>ערכי הקבוצה של הנתון — לפירוט "חלוקה לפי"</summary>
    public List<MetricGroupDto> Groups { get; set; } = new();
    public string? DateField { get; set; }
    /// <summary>הנתון לא נשלף מה-DB (שגיאה/אין חריגה בפועל) — מוצג באפור</summary>
    public bool IsStale { get; set; }
    public double Trend { get; set; }
    public bool? HasComparison { get; set; }
    public bool TrendPositive { get; set; } = true;
    public string Status { get; set; } = "ok";
    public bool Updated { get; set; } = true;
    public string? TargetText { get; set; }
    public string? SignType { get; set; }
}
public class MetricGroupDto
{
    public string Value { get; set; } = string.Empty;
    public int Records { get; set; }
    public decimal? TotalValue { get; set; }
}

