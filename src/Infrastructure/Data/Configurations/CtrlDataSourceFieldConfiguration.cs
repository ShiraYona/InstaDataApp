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
        b.Property(x => x.FieldID).ValueGeneratedOnAdd();
        b.Property(x => x.FieldName).HasMaxLength(128).IsRequired();
        b.Property(x => x.DisplayName).HasMaxLength(150).IsRequired();
        b.Property(x => x.DataType).HasMaxLength(30).IsRequired();
        b.Property(x => x.FilterInputType).HasMaxLength(10);
        b.Property(x => x.ValueSource).HasMaxLength(10);
    }
}
