using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>CTRL_FilterOperators — טבלה קיימת (ID / Nome / Name / NeedsValue / IsMultiValue / IsActive / SortOrder).</summary>
public class CtrlFilterOperatorConfiguration : IEntityTypeConfiguration<CtrlFilterOperator>
{
    public void Configure(EntityTypeBuilder<CtrlFilterOperator> b)
    {
        b.ToTable("CTRL_FilterOperators");
        b.HasKey(x => x.ID);
        b.Property(x => x.ID).HasColumnName("ID").ValueGeneratedNever();
        b.Property(x => x.Nome).HasColumnName("Nome").HasMaxLength(20).IsRequired();
        b.Property(x => x.Name).HasColumnName("Name").HasMaxLength(100).IsRequired();
        b.Property(x => x.NeedsValue).HasColumnName("NeedsValue");
        b.Property(x => x.IsMultiValue).HasColumnName("IsMultiValue");
        b.Property(x => x.IsActive).HasColumnName("IsActive");
        b.Property(x => x.SortOrder).HasColumnName("SortOrder");
    }
}
