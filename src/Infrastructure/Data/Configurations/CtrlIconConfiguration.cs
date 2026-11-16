using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlIconConfiguration : IEntityTypeConfiguration<CtrlIcon>
{
    public void Configure(EntityTypeBuilder<CtrlIcon> b)
    {
        b.ToTable("CTRL_Icon");
        b.HasKey(x => x.Name);
        b.Property(x => x.Name).HasColumnName("Name").HasMaxLength(50);
    }
}
