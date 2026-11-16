namespace InstaDataApp.Domain.Entities;

public class CtrlPayment
{
    public int PaymentID { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PayerName { get; set; } = string.Empty;
    public int PaymentsCount { get; set; }
    public decimal FullPayment { get; set; }
    public string? PaymentDepartment { get; set; }
}
