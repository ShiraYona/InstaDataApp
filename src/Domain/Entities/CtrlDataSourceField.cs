namespace InstaDataApp.Domain.Entities;

public class CtrlDataSourceField
{
    public int FieldID { get; set; }
    public int SourceID { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsSummable { get; set; }
    public bool IsGroupable { get; set; }
    public bool IsFilterable { get; set; }
    public bool IsVisible { get; set; } = true;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool? IsNullable { get; set; }

    /// <summary>TEXT / NUMBER / DATE / LIST — קובע את רכיב הקלט של המסנן</summary>
    public string? FilterInputType { get; set; }

    /// <summary>CATALOG / FIXED — מהיכן מגיעים ערכי המסנן</summary>
    public string? ValueSource { get; set; }
}
