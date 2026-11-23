using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlDataSourceConfiguration : IEntityTypeConfiguration<CtrlDataSource>
{
    public void Configure(EntityTypeBuilder<CtrlDataSource> b)
    {
        b.ToTable("CTRL_DataSources");
        b.HasKey(x => x.SourceID);
        b.Property(x => x.SourceID).ValueGeneratedOnAdd();
        b.Property(x => x.SourceName).HasMaxLength(150).IsRequired();
        b.Property(x => x.SourceType).HasMaxLength(20).IsRequired();
        b.Property(x => x.SchemaName).HasMaxLength(128);
        b.Property(x => x.ObjectName).HasMaxLength(128).IsRequired();
        b.Property(x => x.OutputType).HasMaxLength(20).IsRequired();

        // הטבלה שהמסד כבר מכיר — אין מפתחות זרים מוגדרים ב-DDL.
        b.HasMany(x => x.Fields).WithOne().HasForeignKey(f => f.SourceID).OnDelete(DeleteBehavior.NoAction);
        b.HasMany(x => x.Parameters).WithOne().HasForeignKey(p => p.SourceID).OnDelete(DeleteBehavior.NoAction);
    }
}
