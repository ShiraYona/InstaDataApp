namespace InstaDataApp.Domain.Entities;

public class CtrlDataSource
{
    public int SourceID { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;  // TABLE / PROCEDURE
    public string? SchemaName { get; set; }
    public string ObjectName { get; set; } = string.Empty;
    public string OutputType { get; set; } = string.Empty;   // ROWS / SCALAR
    public int? DateFieldID { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }

    public ICollection<CtrlDataSourceField> Fields { get; set; } = new List<CtrlDataSourceField>();
    public ICollection<CtrlDataSourceParameter> Parameters { get; set; } = new List<CtrlDataSourceParameter>();
}
