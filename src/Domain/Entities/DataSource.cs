namespace InstaDataApp.Domain.Entities;


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

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public List<DataSourceField> Fields { get; set; } = new();
}
