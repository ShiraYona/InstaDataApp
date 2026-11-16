using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

public class CtrlMetricDetailFieldConfiguration : IEntityTypeConfiguration<CtrlMetricDetailField>
{
    public void Configure(EntityTypeBuilder<CtrlMetricDetailField> b)
    {
        b.ToTable("CTRL_MetricDetailFields");

        // PK מורכב לפי האפיון: MetricID + FieldID
        b.HasKey(x => new { x.MetricID, x.FieldID });
    }
}
