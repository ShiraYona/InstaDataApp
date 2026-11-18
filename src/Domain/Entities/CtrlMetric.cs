namespace InstaDataApp.Domain.Entities;

public class CtrlMetric
{
    public int MetricID { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public int SourceID { get; set; }
    public int CalculationTypeID { get; set; }
    public CtrlCalculationType? CalculationType { get; set; }
    public int? SumFieldID { get; set; }
    public int? GroupFieldID { get; set; }
    /// <summary>
    /// תקופת החישוב — העמודה במסד היא nvarchar(20) ושומרת את הטקסט (למשל "30 ימים")
    /// או את הערך הקבוע BOARD_FILTER. לא מספר — אל תשנו ל-int.
    /// </summary>
    public string? DateRangeType { get; set; }
    public string? IconCode { get; set; }
    public bool IsActive { get; set; } = true;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
