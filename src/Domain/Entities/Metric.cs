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
}
