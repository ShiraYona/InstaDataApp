namespace InstaDataApp.Application.Common.Models;

/// <summary>פריט קטלוג לתצוגה (צוות / עובד).</summary>
public class LookupItemDto
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;

    /// <summary>שיוך לצוות — רלוונטי לעובדים בלבד.</summary>
    public int? TeamID { get; set; }
}

/// <summary>קטלוגי התצוגה של מסך המשימות.</summary>
public class TaskLookupsDto
{
    public List<LookupItemDto> Teams { get; set; } = new();
    public List<LookupItemDto> People { get; set; } = new();
}
