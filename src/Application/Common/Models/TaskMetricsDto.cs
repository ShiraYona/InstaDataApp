namespace InstaDataApp.Application.Common.Models;
public class TaskMetricsDto
{
    public int Open { get; set; }

    public int InProgress { get; set; }
    public int Late { get; set; }
    public int HighPriority { get; set; }
    public int Completed { get; set; }
    public int CompletedOnTime { get; set; }
    public int? OnTimeRatePercent =>
        Completed == 0 ? null : (int)Math.Round(CompletedOnTime * 100d / Completed);
    public int Total { get; set; }
}
