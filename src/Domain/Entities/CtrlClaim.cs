namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מיפוי לטבלת CTRL_Claims — תביעות.
/// </summary>
public class CtrlClaim
{
    public int ClaimID { get; set; }
    public DateTime ClaimDate { get; set; }
    public string ClaimantName { get; set; } = string.Empty;
    public string? ClaimDescription { get; set; }
    public decimal ClaimAmount { get; set; }
    public int ClaimantsCount { get; set; }
    public string? ClaimDepartment { get; set; }
}
