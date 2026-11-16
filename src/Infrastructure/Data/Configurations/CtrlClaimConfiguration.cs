using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlClaimConfiguration : IEntityTypeConfiguration<CtrlClaim>
{
    public void Configure(EntityTypeBuilder<CtrlClaim> b)
    {
        b.ToTable("CTRL_Claims");
        b.HasKey(x => x.ClaimID);

        b.Property(x => x.ClaimID).HasColumnName("claim_id").ValueGeneratedOnAdd();
        b.Property(x => x.ClaimDate).HasColumnName("claim_date");
        b.Property(x => x.ClaimantName).HasColumnName("claimant_name").HasMaxLength(128).IsRequired();
        b.Property(x => x.ClaimDescription).HasColumnName("claim_description").HasMaxLength(500);
        b.Property(x => x.ClaimAmount).HasColumnName("claim_amount").HasPrecision(18, 2);
        b.Property(x => x.ClaimantsCount).HasColumnName("claimants_count");
        b.Property(x => x.ClaimDepartment).HasColumnName("claim_department").HasMaxLength(128);
    }
}
