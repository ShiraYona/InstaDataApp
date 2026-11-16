namespace InstaDataApp.Domain.Entities;

public class CtrlCalculationType
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? SignType { get; set; }
    public ICollection<CtrlMetric> Metrics { get; set; } = new List<CtrlMetric>();
}
