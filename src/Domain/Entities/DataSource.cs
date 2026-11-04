namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מקור נתונים — טבלת CTRL_DataSources.
/// כל מקור מפנה לאובייקט במסד (פרוצדורה/תצוגה) שממנו נשלפים הנתונים.
/// </summary>
public class DataSource
{
    public int SourceID { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public string SchemaName { get; set; } = string.Empty;

    public string ObjectName { get; set; } = string.Empty;

    public string OutputType { get; set; } = string.Empty;

    /// <summary>שדה התאריך של המקור — קובע את "שדה תאריך" בטופס</summary>
    public int? DateFieldID { get; set; }

    /// <summary>
    /// סמל הכרטיס של המקור (קוד כמו chart-line / wallet).
    /// מזהה את המקור ברשימת המקורות ובשדה "סמל כרטיס" בטופס.
    /// </summary>
    public string? IconCode { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public List<DataSourceField> Fields { get; set; } = new();
}
