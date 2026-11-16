using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlDataSourceFieldConfiguration : IEntityTypeConfiguration<CtrlDataSourceField>
{
    public void Configure(EntityTypeBuilder<CtrlDataSourceField> b)
    {
        b.ToTable("CTRL_DataSourceFields");
        b.HasKey(x => x.FieldID);
        b.Property(x => x.FieldID).ValueGeneratedNever();
        b.Property(x => x.FieldName).HasMaxLength(128).IsRequired();
        b.Property(x => x.DisplayName).HasMaxLength(128);
        b.Property(x => x.DataType).HasMaxLength(50).IsRequired();
    }
}
