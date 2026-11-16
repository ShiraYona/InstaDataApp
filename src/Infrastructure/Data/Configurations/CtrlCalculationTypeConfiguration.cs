using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlCalculationTypeConfiguration : IEntityTypeConfiguration<CtrlCalculationType>
{
    public void Configure(EntityTypeBuilder<CtrlCalculationType> b)
    {
        b.ToTable("CTRL_CalculationTypes");
        b.HasKey(x => x.ID);
        b.Property(x => x.ID).HasColumnName("ID").ValueGeneratedNever();
        b.Property(x => x.Name).HasColumnName("Name").HasMaxLength(50).IsRequired();
        b.Property(x => x.Value).HasColumnName("Value").HasMaxLength(200).IsRequired();
        b.Property(x => x.SignType).HasColumnName("SignType").HasMaxLength(50);
        b.HasIndex(x => x.Value).IsUnique();
    }
}
