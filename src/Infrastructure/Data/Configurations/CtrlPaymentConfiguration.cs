using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlPaymentConfiguration : IEntityTypeConfiguration<CtrlPayment>
{
    public void Configure(EntityTypeBuilder<CtrlPayment> b)
    {
        b.ToTable("CTRL_Payments");
        b.HasKey(x => x.PaymentID);

        b.Property(x => x.PaymentID).HasColumnName("payment_id").ValueGeneratedOnAdd();
        b.Property(x => x.PaymentDate).HasColumnName("payment_date");
        b.Property(x => x.PayerName).HasColumnName("payer_name").HasMaxLength(128).IsRequired();
        b.Property(x => x.PaymentsCount).HasColumnName("payments_count");
        b.Property(x => x.FullPayment).HasColumnName("full_payment").HasPrecision(18, 2);
        b.Property(x => x.PaymentDepartment).HasColumnName("payment_department").HasMaxLength(128);
    }
}
