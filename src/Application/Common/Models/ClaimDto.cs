namespace InstaDataApp.Application.Common.Models;

/// <summary>שורת תביעה אחת (CTRL_Claims).</summary>
public class ClaimDto
{
    public int ClaimId { get; set; }
    public string ClaimDate { get; set; } = string.Empty;
    public string ClaimantName { get; set; } = string.Empty;
    public string? ClaimDescription { get; set; }
    public decimal ClaimAmount { get; set; }
    public int ClaimantsCount { get; set; }
    public string? ClaimDepartment { get; set; }
}
