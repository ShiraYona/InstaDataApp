namespace InstaDataApp.Domain.Entities;

public class CtrlDataSourceParameter
{
    public int ParameterID { get; set; }
    public int SourceID { get; set; }
    public string ParameterName { get; set; } = string.Empty;
    public string ParameterType { get; set; } = string.Empty;
    public string? ParameterValue { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
}
