namespace InstaDataApp.Domain.Entities;
public class Metric
{
    public int MetricId { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public string? IconCode { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }

    public int SourceId { get; set; }

    public string CalculationType { get; set; } = string.Empty;
    public int? SumFieldId { get; set; }
    public int? GroupFieldId { get; set; }
    public string DateRangeType { get; set; } = string.Empty;

    public string CreatedBy { get; set; } = string.Empty;

    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
