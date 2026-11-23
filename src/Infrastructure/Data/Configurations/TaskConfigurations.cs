using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InstaDataApp.Infrastructure.Data.Configurations;

/// <summary>CTRL_Tasks — משימות ובקרה תפעולית.</summary>
public class CtrlTaskConfiguration : IEntityTypeConfiguration<CtrlTask>
{
    public void Configure(EntityTypeBuilder<CtrlTask> b)
    {
        b.ToTable("CTRL_Tasks", tb =>
        {
            tb.HasTrigger("TR_CTRL_Tasks_AfterInsert");
            tb.HasTrigger("TR_CTRL_Tasks_InsteadOfUpdate");
        });
        b.HasKey(x => x.TaskID);

        b.Property(x => x.TaskID).ValueGeneratedOnAdd();
        b.Property(x => x.TaskTitle).HasMaxLength(150).IsRequired();
        b.Property(x => x.TaskDescription).HasMaxLength(2000);
        b.Property(x => x.TeamID).IsRequired();
        b.Property(x => x.AssignedUserID).HasMaxLength(128);
        b.Property(x => x.Priority).HasMaxLength(20).IsRequired();
        b.Property(x => x.Status).HasMaxLength(20).IsRequired();
        b.Property(x => x.DueDate).HasColumnType("date").IsRequired();
        b.Property(x => x.SourceType).HasMaxLength(20).IsRequired();
        b.Property(x => x.SourceSystemCode).HasMaxLength(100);
        b.Property(x => x.SourceEntityType).HasMaxLength(128);
        b.Property(x => x.SourceEntityID).HasMaxLength(150);
        b.Property(x => x.SourceURL).HasMaxLength(2048);
        b.Property(x => x.CreatedBy).HasMaxLength(130).IsRequired();
        b.Property(x => x.CreatedDate).IsRequired();
        b.Property(x => x.UpdatedBy).HasMaxLength(130);
        b.Property(x => x.RowVersion).IsRowVersion();

        b.HasIndex(x => x.Status);
        b.HasIndex(x => x.AssignedUserID);
        b.HasIndex(x => x.DueDate);

        b.HasOne<CtrlMetric>()
            .WithMany()
            .HasForeignKey(x => x.MetricID)
            .OnDelete(DeleteBehavior.NoAction);
    }
}

/// <summary>CTRL_TaskViews — מועד הצפייה האחרון של כל משתמש בכל משימה.</summary>
public class CtrlTaskViewConfiguration : IEntityTypeConfiguration<CtrlTaskView>
{
    public void Configure(EntityTypeBuilder<CtrlTaskView> b)
    {
        b.ToTable("CTRL_TaskViews");
        // מפתח מורכב — שורה אחת לכל זוג (משימה, משתמש); upsert טבעי.
        b.HasKey(x => new { x.TaskID, x.UserID });

        b.Property(x => x.UserID).HasMaxLength(128).IsRequired();
        b.Property(x => x.LastViewedDate).IsRequired();

        b.HasOne<CtrlTask>()
            .WithMany()
            .HasForeignKey(x => x.TaskID)
            .OnDelete(DeleteBehavior.Cascade);

        // שאילתת "חדש מאז צפייה": סינון לפי משתמש ואז השוואת מועדים.
        b.HasIndex(x => new { x.UserID, x.LastViewedDate });
    }
}

/// <summary>CTRL_TaskComments — הערות טיפול על משימה.</summary>
public class CtrlTaskCommentConfiguration : IEntityTypeConfiguration<CtrlTaskComment>
{
    public void Configure(EntityTypeBuilder<CtrlTaskComment> b)
    {
        b.ToTable("CTRL_TaskComments");
        b.HasKey(x => x.CommentID);

        b.Property(x => x.CommentID).ValueGeneratedOnAdd();
        b.Property(x => x.CommentText).HasMaxLength(2000).IsRequired();
        b.Property(x => x.CreatedBy).HasMaxLength(128).IsRequired();
        b.Property(x => x.CreatedDate).IsRequired();

        b.HasOne<CtrlTask>()
            .WithMany()
            .HasForeignKey(x => x.TaskID)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => x.TaskID);
    }
}

/// <summary>CTRL_TaskHistory — יומן שינויים על משימה.</summary>
public class CtrlTaskHistoryConfiguration : IEntityTypeConfiguration<CtrlTaskHistory>
{
    public void Configure(EntityTypeBuilder<CtrlTaskHistory> b)
    {
        b.ToTable("CTRL_TaskHistory");
        b.HasKey(x => x.HistoryID);

        b.Property(x => x.HistoryID).ValueGeneratedOnAdd();
        b.Property(x => x.ActionType).HasMaxLength(30).IsRequired();
        b.Property(x => x.FieldName).HasMaxLength(100);
        b.Property(x => x.OldValue);
        b.Property(x => x.NewValue);
        b.Property(x => x.ChangedBy).HasMaxLength(128).IsRequired();
        b.Property(x => x.ChangedDate).IsRequired();

        b.HasOne<CtrlTask>()
            .WithMany()
            .HasForeignKey(x => x.TaskID)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasIndex(x => x.TaskID);
    }
}
