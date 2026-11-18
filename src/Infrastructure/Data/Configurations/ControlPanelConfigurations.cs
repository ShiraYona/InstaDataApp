using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;


/// <summary>
/// CTRL_ICON — סמלי הכרטיס (ID / Value / IconClass).
/// עמודת Name הוסרה מהטבלה; מחלקת האייקון היא הערך שנשמר במדד.
/// </summary>
public class CardIconConfiguration : IEntityTypeConfiguration<CardIcon>
{
    public void Configure(EntityTypeBuilder<CardIcon> builder)
    {
        builder.ToTable("CTRL_ICON", schema: "dbo");
        builder.HasKey(x => x.ID);

        builder.Property(x => x.ID).HasColumnName("ID").ValueGeneratedOnAdd();
        builder.Property(x => x.Value).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IconClass).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.IconClass).IsUnique();
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
        builder.Property(x => x.Name).HasMaxLength(50).IsRequired();
    }
}
