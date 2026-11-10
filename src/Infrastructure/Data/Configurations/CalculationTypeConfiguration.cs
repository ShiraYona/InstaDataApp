using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>
/// מיפוי <see cref="CalculationType"/> לטבלה הקיימת <c>dbo.CTRL_CalculationTypes</c>.
/// </summary>
public class CalculationTypeConfiguration : IEntityTypeConfiguration<CalculationType>
{
    public void Configure(EntityTypeBuilder<CalculationType> builder)
    {
        builder.ToTable("CTRL_CalculationTypes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("ID")
            .ValueGeneratedOnAdd();

        builder.Property(x => x.Name)
            .HasColumnName("Name")
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(x => x.Name).IsUnique();

        builder.Property(x => x.Value)
            .HasColumnName("Value")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.SignType)
            .HasColumnName("SignType")
            .HasMaxLength(50);
    }
}
