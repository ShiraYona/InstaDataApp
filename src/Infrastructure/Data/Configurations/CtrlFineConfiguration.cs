using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlFineConfiguration : IEntityTypeConfiguration<CtrlFine>
{
    public void Configure(EntityTypeBuilder<CtrlFine> b)
    {
        b.ToTable("CTRL_Fines");
        b.HasKey(x => x.FineID);

        b.Property(x => x.FineID).HasColumnName("fine_id").ValueGeneratedOnAdd();
        b.Property(x => x.PayerName).HasColumnName("payer_name").HasMaxLength(128).IsRequired();
        b.Property(x => x.FineDate).HasColumnName("fine_date");
        b.Property(x => x.FineReason).HasColumnName("fine_reason").HasMaxLength(255);
        b.Property(x => x.FineAmount).HasColumnName("fine_amount").HasPrecision(18, 2);
        b.Property(x => x.IsPaid).HasColumnName("is_paid");
    }
}
