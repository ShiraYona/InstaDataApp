namespace InstaDataApp.Domain.Entities;

/// <summary>
/// סוג חישוב (COUNT / SUM / ...) — ממופה לטבלה הקיימת <c>dbo.CTRL_CalculationTypes</c>.
/// </summary>
public class CalculationTypeDefinition
{
    /// <summary>מזהה — עמודה <c>Id</c> (IDENTITY)</summary>
    public int Id { get; set; }

    /// <summary>שם לתצוגה (ייחודי ב-DB)</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>הערך הטכני (למשל COUNT / SUM)</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>סוג הסימן — אופציונלי</summary>
    public string? SignType { get; set; }
}
