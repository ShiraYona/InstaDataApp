using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>
/// מיפוי לטבלה הקיימת CTRL_Metrics — לקריאה בלבד.
/// </summary>
public class MetricConfiguration : IEntityTypeConfiguration<Metric>
{
    public void Configure(EntityTypeBuilder<Metric> builder)
    {
        builder.ToTable("CTRL_Metrics");

        builder.HasKey(x => x.MetricId);

        builder.Property(x => x.MetricId)
            .HasColumnName("MetricID");

        builder.Property(x => x.MetricName)
            .HasColumnName("MetricName")
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(x => x.IconCode)
            .HasColumnName("IconCode")
            .HasMaxLength(50);

        builder.Property(x => x.IsActive)
            .HasColumnName("IsActive")
            .IsRequired();

        builder.Property(x => x.CreatedDate)
            .HasColumnName("CreatedDate")
            .HasColumnType("datetime2")
            .IsRequired();
    }
}
