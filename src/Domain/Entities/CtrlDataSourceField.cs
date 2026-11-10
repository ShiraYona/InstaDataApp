namespace InstaDataApp.Domain.Entities;

public class CtrlDataSourceField
{
    public int FieldID { get; set; }
    public int SourceID { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string DataType { get; set; } = string.Empty;
    public bool IsSummable { get; set; }
    public bool IsGroupable { get; set; }
    public bool IsFilterable { get; set; }
    public bool IsVisible { get; set; } = true;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
