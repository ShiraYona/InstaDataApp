using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>
/// מיפוי לטבלה הקיימת CTRL_UserDisplaySettings.
/// PUT/POST לא יוצרים טבלה חדשה — ה-SchemaAlreadyExists נבדק ב-Migration.
/// </summary>
public class UserDisplaySettingsConfiguration : IEntityTypeConfiguration<UserDisplaySettings>
{
    public void Configure(EntityTypeBuilder<UserDisplaySettings> builder)
    {
        builder.ToTable("CTRL_UserDisplaySettings");

        builder.HasKey(x => x.UserId);
        builder.Property(x => x.UserId)
            .HasColumnName("UserID")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.CardsPerRow)
            .HasColumnName("CardsPerRow")
            .IsRequired();

        builder.Property(x => x.UpdatedDate)
            .HasColumnName("UpdatedDate")
            .HasColumnType("datetime2")
            .IsRequired();

        // לא מגדירים CHECK Constraint בקוד — הוא קיים בטבלה.
        // MetaState = No CHECK -> כדי שה-Migration לא תנסה להמציא אחד חדש.
    }
}
