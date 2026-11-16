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

/// <summary>CTRL_ICON — סמלי הכרטיס (ID / Name / Value / IconClass).</summary>
public class CardIconConfiguration : IEntityTypeConfiguration<CardIcon>
{
    public void Configure(EntityTypeBuilder<CardIcon> builder)
    {
        builder.ToTable("CTRL_ICON", schema: "dbo");
        builder.HasKey(x => x.ID);

        builder.Property(x => x.ID).HasColumnName("ID").ValueGeneratedOnAdd();
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
        builder.HasKey(x => x.Id);

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
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.Name).IsUnique();
    }
}
