namespace InstaDataApp.Domain.Entities;

public class CtrlFine
{
    public int FineID { get; set; }
    public string PayerName { get; set; } = string.Empty;
    public DateTime FineDate { get; set; }
    public string? FineReason { get; set; }
    public decimal FineAmount { get; set; }
    public bool IsPaid { get; set; }
}
