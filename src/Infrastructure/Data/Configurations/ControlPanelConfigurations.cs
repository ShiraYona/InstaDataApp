using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;


/// <summary>CTRL_DataSources — מקורות הנתונים שמהם נשלפים הנתונים.</summary>
public class DataSourceConfiguration : IEntityTypeConfiguration<DataSource>
{
    public void Configure(EntityTypeBuilder<DataSource> builder)
    {
        builder.ToTable("CTRL_DataSources", schema: "dbo");
        builder.HasKey(x => x.SourceID);

        builder.Property(x => x.SourceName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.SourceType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.SchemaName).HasMaxLength(128).IsRequired();   
        builder.Property(x => x.ObjectName).HasMaxLength(128).IsRequired();   
        builder.Property(x => x.OutputType).HasMaxLength(20).IsRequired();

        builder.HasIndex(x => x.SourceName).IsUnique();

    }
}

/// <summary>CTRL_DataSourceFields — השדות של כל מקור נתונים.</summary>
public class DataSourceFieldConfiguration : IEntityTypeConfiguration<DataSourceField>
{
    public void Configure(EntityTypeBuilder<DataSourceField> builder)
    {
        builder.ToTable("CTRL_DataSourceFields", schema: "dbo");
        builder.HasKey(x => x.FieldID);

        builder.Property(x => x.FieldName).HasMaxLength(128).IsRequired();   
        builder.Property(x => x.DisplayName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.DataType).HasMaxLength(30).IsRequired();

        builder.HasOne(x => x.Source)
            .WithMany(x => x.Fields)
            .HasForeignKey(x => x.SourceID)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(x => new { x.SourceID, x.FieldName }).IsUnique();
    }
}

/// <summary>CTRL_Metrics — ההגדרות של הנתונים (הטופס "יצירת נתון חדש").</summary>
public class MetricConfiguration : IEntityTypeConfiguration<Metric>
{
    public void Configure(EntityTypeBuilder<Metric> builder)
    {
        builder.ToTable("CTRL_Metrics", schema: "dbo");
        builder.HasKey(x => x.MetricID);

        builder.Property(x => x.MetricName).HasMaxLength(80).IsRequired();
        // הטבלה מגדירה VARCHAR(20); ברירת המחדל של EF \u200F(NVARCHAR) הייתה מתפוצצת
        // על עמודת אחסון צרה יותר
        builder.Property(x => x.CalculationType).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.DateRangeType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.IconCode).HasMaxLength(50);
        builder.Property(x => x.CreatedBy).HasMaxLength(128).IsRequired();
        builder.Property(x => x.UpdatedBy).HasMaxLength(128);

        // IsActive — BIT: EF ממפה bool ל-BIT כברירת מחדל; 0 = כבוי, 1 = מוצג בלוח
        builder.Property(x => x.IsActive).IsRequired();

        // RowVersion מנוהל על ידי המסד — טוקן זרימה מקבילית
        builder.Property(x => x.RowVersion).IsRowVersion();

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

/// <summary>CTRL_ICON — סמלי הכרטיס (ID / Name / Value / IconClass).</summary>
public class CardIconConfiguration : IEntityTypeConfiguration<CardIcon>
{
    public void Configure(EntityTypeBuilder<CardIcon> builder)
    {
        builder.ToTable("CTRL_ICON", schema: "dbo");
        builder.HasKey(x => x.ID);

        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IconClass).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.Name).IsUnique();
    }
}

/// <summary>CTRL_CalculationDays — מספר הימים לחישוב (ID / Name / Value).</summary>
public class CalculationPeriodConfiguration : IEntityTypeConfiguration<CalculationPeriod>
{
    public void Configure(EntityTypeBuilder<CalculationPeriod> builder)
    {
        builder.ToTable("CTRL_CalculationDays", schema: "dbo");
        builder.HasKey(x => x.ID);

        // Name = הטקסט שמוצג ("30 ימים"); Value = מספר הימים עצמו (INT)
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Value).IsUnique();
    }
}

/// <summary>CTRL_CalculationTypes — סוגי החישוב (ID / Name / Value).</summary>
public class CalculationTypeConfiguration : IEntityTypeConfiguration<CalculationTypeDefinition>
{
    public void Configure(EntityTypeBuilder<CalculationTypeDefinition> builder)
    {
        builder.ToTable("CTRL_CalculationTypes", schema: "dbo");
        builder.HasKey(x => x.ID);

        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.Name).IsUnique();
    }
}
