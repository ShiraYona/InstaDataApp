using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlMetricConfiguration : IEntityTypeConfiguration<CtrlMetric>
{
    public void Configure(EntityTypeBuilder<CtrlMetric> builder)
    {
        builder.ToTable("CTRL_Metrics");
        builder.HasKey(m => m.MetricID);

        builder.Property(m => m.MetricID).HasColumnName("MetricID").ValueGeneratedOnAdd();
        builder.Property(m => m.MetricName).HasColumnName("MetricName").HasMaxLength(80).IsRequired();
        builder.Property(m => m.SourceID).HasColumnName("SourceID");
        builder.Property(m => m.CalculationType).HasColumnName("CalculationType").HasMaxLength(20).IsRequired();
        builder.Property(m => m.SumFieldID).HasColumnName("SumFieldID");
        builder.Property(m => m.GroupFieldID).HasColumnName("GroupFieldID");
        builder.Property(m => m.DateRangeType).HasColumnName("DateRangeType").HasMaxLength(20).IsRequired();
        builder.Property(m => m.IconCode).HasColumnName("IconCode").HasMaxLength(50);
        builder.Property(m => m.IsActive).HasColumnName("IsActive");
        builder.Property(m => m.CreatedBy).HasColumnName("CreatedBy").HasMaxLength(128).IsRequired();
        builder.Property(m => m.CreatedDate).HasColumnName("CreatedDate");
        builder.Property(m => m.UpdatedBy).HasColumnName("UpdatedBy").HasMaxLength(128);
        builder.Property(m => m.UpdatedDate).HasColumnName("UpdatedDate");
        builder.Property(m => m.RowVersion).HasColumnName("RowVersion").IsRowVersion();
    }
}
