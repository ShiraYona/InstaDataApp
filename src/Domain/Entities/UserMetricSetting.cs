namespace InstaDataApp.Domain.Entities;

/// <summary>
/// הגדרות אישיות של משתמש עבור נתון בודד: מיקום ושמירה/הסתרה.
/// ממופה לטבלה הקיימת CTRL_UserMetricSettings.
/// </summary>
public class UserMetricSetting
{
    public string UserId { get; set; } = string.Empty;
    public int MetricId { get; set; }

    /// <summary>מיקום אישי שמור. null = המשתמש עדיין לא סידר את הנתון הזה.</summary>
    public int? DisplayOrder { get; set; }

    /// <summary>האם הנתון מוצג למשתמש הזה.</summary>
    public bool IsVisible { get; set; } = true;

    public DateTime UpdatedDate { get; set; }
}
