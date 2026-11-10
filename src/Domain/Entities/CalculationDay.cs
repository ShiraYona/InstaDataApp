namespace InstaDataApp.Domain.Entities;

/// <summary>
/// תקופת חישוב (מספר ימים) — ממופה לטבלה הקיימת <c>dbo.CTRL_CalculationDays</c>.
/// הטבלה נוצרה מחוץ ל-EF, לכן המחלקה אינה יורשת מ-BaseEntity.
/// </summary>
public class CalculationDay
{
    public int CalculationDayId { get; set; }

    /// <summary>שם התקופה להצגה (ייחודי ב-DB)</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>מספר הימים שמהם מחושבת התקופה</summary>
    public int Value { get; set; }
}
