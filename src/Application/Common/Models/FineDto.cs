namespace InstaDataApp.Application.Common.Models;

public class FineDto
{
    public int FineId { get; set; }
    public string PayerName { get; set; } = string.Empty;
    public string FineDate { get; set; } = string.Empty;
    public string? FineReason { get; set; }
    public decimal FineAmount { get; set; }
    public bool IsPaid { get; set; }
}
