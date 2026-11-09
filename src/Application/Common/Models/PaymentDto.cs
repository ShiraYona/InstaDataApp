namespace InstaDataApp.Application.Common.Models;

public class PaymentDto
{
    public int PaymentId { get; set; }
    public string PaymentDate { get; set; } = string.Empty;
    public string PayerName { get; set; } = string.Empty;
    public int PaymentsCount { get; set; }
    public decimal FullPayment { get; set; }
    public string? PaymentDepartment { get; set; }
}
