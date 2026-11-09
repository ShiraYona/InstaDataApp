using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>
/// מיפוי <see cref="CalculationDay"/> לטבלה הקיימת <c>dbo.CTRL_CalculationDays</c>.
/// כל עמודה ממופה בשמה המדויק; אין כאן פעולה שמייצרת/משנה את המבנה במסד.
/// </summary>
public class CalculationDayConfiguration : IEntityTypeConfiguration<CalculationDay>
{
    public void Configure(EntityTypeBuilder<CalculationDay> builder)
    {
        builder.ToTable("CTRL_CalculationDays");

        builder.HasKey(x => x.CalculationDayId);

        builder.Property(x => x.CalculationDayId)
            .HasColumnName("ID")
            .ValueGeneratedOnAdd();

        builder.Property(x => x.Name)
            .HasColumnName("Name")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(x => x.Name).IsUnique();

        builder.Property(x => x.Value)
            .HasColumnName("Value")
            .IsRequired();
    }
}
