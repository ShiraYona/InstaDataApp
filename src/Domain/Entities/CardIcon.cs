namespace InstaDataApp.Domain.Entities;

/// <summary>
/// סמל כרטיס — טבלת CTRL_Symbols (ID / Name / Value / IconClass).
/// ה-Name נשמר ב-CTRL_Metrics.IconCode, וה-Value הוא המילה שמוצגת למשתמש
/// לצד האייקון (IconClass — מחלקת PrimeIcons, כמו "pi pi-dollar").
/// </summary>
public class CardIcon
{
    public int ID { get; set; }

    /// <summary>קוד הסמל — הערך שנשמר במדד</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>המילה המוצגת למשתמש לצד האייקון</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>מחלקת האייקון של PrimeIcons</summary>
    public string IconClass { get; set; } = string.Empty;
}
