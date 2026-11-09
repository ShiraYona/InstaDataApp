using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class MetricConfiguration : IEntityTypeConfiguration<Metric>
{
    public void Configure(EntityTypeBuilder<Metric> builder)
    {
        builder.ToTable("CTRL_Metrics", table => table.HasCheckConstraint(
            "CK__CTRL_Metr__Calcu__267ABA7A",
            "[CalculationType]='DIRECT' OR [CalculationType]='SUM' OR [CalculationType]='COUNT'"));

        builder.HasKey(x => x.MetricId);

        builder.Property(x => x.MetricId)
            .HasColumnName("MetricID")
            .ValueGeneratedOnAdd();

        builder.Property(x => x.MetricName)
            .HasColumnName("MetricName")
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(x => x.SourceId)
            .HasColumnName("SourceID");

        builder.Property(x => x.CalculationType)
            .HasColumnName("CalculationType")
            .HasColumnType("varchar(20)")
            .IsRequired();

        builder.Property(x => x.SumFieldId)
            .HasColumnName("SumFieldID");

        builder.Property(x => x.GroupFieldId)
            .HasColumnName("GroupFieldID");

        builder.Property(x => x.DateRangeType)
            .HasColumnName("DateRangeType")
            .HasColumnType("varchar(20)")
            .IsRequired();

        builder.Property(x => x.IconCode)
            .HasColumnName("IconCode")
            .HasMaxLength(50);

        builder.Property(x => x.IsActive)
            .HasColumnName("IsActive");

        builder.Property(x => x.CreatedBy)
            .HasColumnName("CreatedBy")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.CreatedDate)
            .HasColumnName("CreatedDate")
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(x => x.UpdatedBy)
            .HasColumnName("UpdatedBy")
            .HasMaxLength(128);

        builder.Property(x => x.UpdatedDate)
            .HasColumnName("UpdatedDate")
            .HasColumnType("datetime2");

        builder.Property(x => x.RowVersion)
            .HasColumnName("RowVersion")
            .IsRowVersion();
    }
}
