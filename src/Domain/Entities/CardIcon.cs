namespace InstaDataApp.Domain.Entities;

/// <summary>
/// סמל כרטיס — טבלת CTRL_ICON (ID / Value / IconClass).
/// אין עמודת Name: מחלקת האייקון (IconClass, כמו "pi pi-dollar") היא הקוד שנשמר
/// ב-CTRL_Metrics.IconCode, וה-Value הוא המילה שמוצגת למשתמש לצד האייקון.
/// </summary>
public class CardIcon
{
    public int ID { get; set; }

    /// <summary>המילה המוצגת למשתמש לצד האייקון</summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>מחלקת האייקון של PrimeIcons — הערך שנשמר במדד</summary>
    public string IconClass { get; set; } = string.Empty;
}
