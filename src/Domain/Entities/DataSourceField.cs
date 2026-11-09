namespace InstaDataApp.Domain.Entities;

/// <summary>
/// שדה של מקור נתונים — טבלת CTRL_DataSourceFields.
/// הדגלים קובעים היכן השדה יכול לשמש בטופס: סיכום, קיבוץ, פירוט.
/// </summary>
public class DataSourceField
{
    public int FieldID { get; set; }

    public int SourceID { get; set; }

    public DataSource Source { get; set; } = null!;

    /// <summary>השם הטכני של השדה במקור (sysname)</summary>
    public string FieldName { get; set; } = string.Empty;

    /// <summary>התווית המוצגת למשתמש</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>סוג הנתון (int, decimal, datetime...)</summary>
    public string DataType { get; set; } = string.Empty;

    public bool IsSummable { get; set; }

    public bool IsGroupable { get; set; }

    public bool IsFilterable { get; set; }

    public bool IsVisible { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }
}
