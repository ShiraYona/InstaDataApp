using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>
/// מיפוי לטבלה הקיימת CTRL_UserMetricSettings.
/// המפתח מורכב: משתמש + נתון.
/// </summary>
public class UserMetricSettingConfiguration : IEntityTypeConfiguration<UserMetricSetting>
{
    public void Configure(EntityTypeBuilder<UserMetricSetting> builder)
    {
        builder.ToTable("CTRL_UserMetricSettings");

        builder.HasKey(x => new { x.UserId, x.MetricId });

        builder.Property(x => x.UserId)
            .HasColumnName("UserID")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.MetricId)
            .HasColumnName("MetricID")
            .IsRequired();

        builder.Property(x => x.DisplayOrder)
            .HasColumnName("DisplayOrder");

        builder.Property(x => x.IsVisible)
            .HasColumnName("IsVisible")
            .IsRequired();

        builder.Property(x => x.UpdatedDate)
            .HasColumnName("UpdatedDate")
            .HasColumnType("datetime2")
            .IsRequired();
    }
}
