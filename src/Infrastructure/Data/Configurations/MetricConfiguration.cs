using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>CTRL_Metrics — ההגדרות של הנתונים (הטופס "יצירת נתון חדש").</summary>
public class MetricConfiguration : IEntityTypeConfiguration<Metric>
{
    public void Configure(EntityTypeBuilder<Metric> builder)
    {
        builder.ToTable("CTRL_Metrics", schema: "dbo");
        builder.HasKey(x => x.MetricID);

        builder.Property(x => x.MetricName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.DateRangeType).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IconCode).HasMaxLength(50);
        builder.Property(x => x.CreatedBy).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedBy).HasMaxLength(128);

        // IsActive — BIT: EF ממפה bool ל-BIT כברירת מחדל
        builder.Property(x => x.IsActive).IsRequired();

        // RowVersion מנוהל על ידי המסד
        builder.Property(x => x.RowVersion).IsRowVersion();

        // CalculationTypeID הוא המפתח ל-CTRL_CalculationTypes;
        // CalculationType עצמו נטען ב-JOIN ואינו עמודה בטבלה
        builder.HasOne(x => x.CalculationType)
            .WithMany()
            .HasForeignKey(x => x.CalculationTypeID)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(x => x.Source)
            .WithMany()
            .HasForeignKey(x => x.SourceID)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(x => x.MetricName).IsUnique();
    }
}

/// <summary>CTRL_MetricDetailFields — שדות הפירוט של נתון, לפי סדר תצוגה.</summary>
public class MetricDetailFieldConfiguration : IEntityTypeConfiguration<MetricDetailField>
{
    public void Configure(EntityTypeBuilder<MetricDetailField> builder)
    {
        builder.ToTable("CTRL_MetricDetailFields", schema: "dbo");

        // מפתח מורכב: אותו שדה לא יופיע פעמיים באותו נתון
        builder.HasKey(x => new { x.MetricID, x.FieldID });

        builder.HasOne(x => x.Metric)
            .WithMany(x => x.DetailFields)
            .HasForeignKey(x => x.MetricID)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
