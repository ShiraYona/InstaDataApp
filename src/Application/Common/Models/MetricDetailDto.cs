namespace InstaDataApp.Application.Common.Models;

public class MetricDetailDto
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DataValue { get; set; } = string.Empty;
    public long RecordsInSample { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string CreatedDate { get; set; } = string.Empty;
    public string? ValueFieldName { get; set; }
    public string? GroupFieldName { get; set; }
    public string GroupFieldLabel { get; set; } = string.Empty;
    public long TotalRecords { get; set; }
    public decimal? TotalValue { get; set; }
    public List<SystemGroupDto> Systems { get; set; } = new();
    public List<DetailColumnDto> Columns { get; set; } = new();
    public List<Dictionary<string, object?>> Records { get; set; } = new();
    public bool IsStale { get; set; }
    /// <summary>סימן סוג החישוב — COUNT/SUM וכן הלאה</summary>
    public string? SignType { get; set; }
}

public class SystemGroupDto
{
    public int SourceId { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string GroupValue { get; set; } = string.Empty;
    public long Records { get; set; }
    public decimal? TotalValue { get; set; }
    public bool IsError { get; set; }
}

public class DetailColumnDto
{
    public string FieldName { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
}
