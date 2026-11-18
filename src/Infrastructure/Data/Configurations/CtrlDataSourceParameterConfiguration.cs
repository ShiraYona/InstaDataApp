using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlDataSourceParameterConfiguration : IEntityTypeConfiguration<CtrlDataSourceParameter>
{
    public void Configure(EntityTypeBuilder<CtrlDataSourceParameter> b)
    {
        b.ToTable("CTRL_DataSourceParameters");
        b.HasKey(x => x.ParameterID);
        b.Property(x => x.ParameterID).ValueGeneratedOnAdd();
        b.Property(x => x.ParameterName).HasMaxLength(128).IsRequired();
        b.Property(x => x.ParameterType).HasMaxLength(30).IsRequired();
        b.Property(x => x.ParameterValue).HasMaxLength(1000);
    }
}
