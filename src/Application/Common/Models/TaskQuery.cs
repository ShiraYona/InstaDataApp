namespace InstaDataApp.Application.Common.Models;
public class TaskQuery
{    public string? Search { get; set; }
    public string[]? Status { get; set; }
    public string[]? Priority { get; set; }
    public string[]? SourceType { get; set; }
    public string[]? State { get; set; }
    public int? TeamID { get; set; }
    public string? AssignedUserID { get; set; }
    public string? DueFrom { get; set; }
    public string? DueTo { get; set; }
    public bool MineOnly { get; set; }
    public bool OverdueOnly { get; set; }
    public int? Period { get; set; }
    public string? MetricFocus { get; set; }
    public string? SortKey { get; set; }
    public string? SortDirection { get; set; }
    public int? Skip { get; set; }
    public int? Take { get; set; }
    public string? CompletionScope { get; set; }
}
