using System.Globalization;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Domain.Entities;
using InstaDataApp.Web.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Web.Controllers;
[Microsoft.AspNetCore.Authorization.Authorize]
[ApiController]
[Route("api/[controller]")]
public class TasksController(IApplicationDbContext context, IUser currentUser) : ControllerBase
{
    private static readonly TimeZoneInfo IsraelTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Israel Standard Time");
    private static IReadOnlyList<int> ActiveTeamIds => TaskCatalog.ActiveTeamIds;
    private static bool IsValidAssignee(string? userId, int teamId) =>
        TaskCatalog.IsValidAssignee(userId, teamId);
    private bool CanAssignToTeam(int teamId)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id)) return false;
        return TaskCatalog.IsActiveTeam(teamId);
    }
    private bool CanModifyTasks() => !string.IsNullOrWhiteSpace(currentUser.Id);

    private static ObjectResult Forbidden403() =>
        new(new { message = "אין הרשאה לביצוע הפעולה" }) { StatusCode = StatusCodes.Status403Forbidden };
    [HttpGet]
    public async Task<List<TaskDto>> GetAll([FromQuery] TaskQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id;
        if (query.MineOnly
            && string.Equals(currentUser.Id, Web.Services.CurrentUser.DevelopmentUserId, StringComparison.Ordinal)
            && query.AssignedUserID is { Length: > 0 } explicitUser)
        {
            userId = explicitUser.Trim();
        }

        var today = TodayInIsrael();
        var filtered = ApplyQuery(
            context.CtrlTasks.AsNoTracking(), query, userId, today,
            NormalizePeriod(query.Period), query.CompletionScope);

        var tasks = await ApplySort(filtered, query)
            .Skip(query.Skip is > 0 ? query.Skip.Value : 0)
            .Take(ClampTake(query.Take))
            .ToListAsync(ct);

        if (tasks.Count == 0) return new List<TaskDto>();

        var ids = tasks.Select(t => t.TaskID).ToList();
        var views = string.IsNullOrWhiteSpace(userId)
            ? new Dictionary<long, DateTime>()
            : await context.CtrlTaskViews
                .AsNoTracking()
                .Where(v => v.UserID == userId && ids.Contains(v.TaskID))
                .ToDictionaryAsync(v => v.TaskID, v => v.LastViewedDate, ct);

        return tasks.Select(t =>
        {
            var dto = ToDto(t);
            dto.IsNewForMe = IsNewSince(t, views.TryGetValue(t.TaskID, out var v) ? v : null);
            return dto;
        }).ToList();
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<TaskDto>> GetById(long id, CancellationToken ct)
    {
        var task = await ApplyScope(context.CtrlTasks.AsNoTracking(), currentUser.Id)
            .FirstOrDefaultAsync(t => t.TaskID == id, ct);

        if (task is null) return NotFound(new { message = "המשימה לא נמצאה" });

        var dto = ToDto(task);

        if (!string.IsNullOrWhiteSpace(currentUser.Id))
        {
            var lastViewed = await context.CtrlTaskViews
                .AsNoTracking()
                .Where(v => v.TaskID == id && v.UserID == currentUser.Id)
                .Select(v => (DateTime?)v.LastViewedDate)
                .FirstOrDefaultAsync(ct);

            dto.IsNewForMe = IsNewSince(task, lastViewed);
        }

        return Ok(dto);
    }

    [HttpGet("count")]
    public async Task<int> GetCount([FromQuery] TaskQuery query, CancellationToken ct)
    {
        var filtered = ApplyQuery(
            context.CtrlTasks.AsNoTracking(), query, currentUser.Id, TodayInIsrael(),
            NormalizePeriod(query.Period), query.CompletionScope);

        return await filtered.CountAsync(ct);
    }

    [HttpGet("metrics")]
    public async Task<TaskMetricsDto> GetMetrics(
        [FromQuery] string? completionScope, CancellationToken ct)
    {
        var userId = currentUser.Id;
        var today = TodayInIsrael();

        var todayOnly = today;

        var scope = ApplyScope(context.CtrlTasks.AsNoTracking(), userId);

        // "הושלמו" / "השלמה במועד" מחושבים לפי אותה תקופה שבה הטבלה מסוננת,
        // כדי שהמדדים והרשימה יציגו תמיד את אותה קבוצת משימות.
        // כשנבחרה "כל המשימות" (scope ריק) — כל המשימות שהושלמו, בלי הגבלת תאריך.
        var effectiveScope = string.IsNullOrWhiteSpace(completionScope) ? "ALL" : completionScope;

        var completedSource = ApplyCompletionScope(scope, effectiveScope, today);

        var completed = completedSource.Where(t => t.Status == "COMPLETED" && t.CompletedDate != null);

        var metrics = new TaskMetricsDto
        {
            Open = await scope.CountAsync(
                t => t.Status == "OPEN" || t.Status == "IN_PROGRESS", ct),
            InProgress = await scope.CountAsync(t => t.Status == "IN_PROGRESS", ct),
            Late = await scope.CountAsync(
                t => (t.Status == "OPEN" || t.Status == "IN_PROGRESS") && t.DueDate < todayOnly, ct),
            HighPriority = await scope.CountAsync(
                t => (t.Status == "OPEN" || t.Status == "IN_PROGRESS")
                     && (t.Priority == "HIGH" || t.Priority == "URGENT"), ct),
            Completed = await completed.CountAsync(ct),
            CompletedOnTime = (await completed
                .Select(t => new { t.CompletedDate, t.DueDate })
                .ToListAsync(ct))
                .Count(t => t.CompletedDate!.Value <
                    t.DueDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)),
            Total = await scope.CountAsync(ct)
        };

        return metrics;
    }
    private static IQueryable<CtrlTask> ApplyScope(IQueryable<CtrlTask> source, string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return source.Where(_ => false);

        return source;
    }

    private static IQueryable<CtrlTask> ApplyQuery(
        IQueryable<CtrlTask> source, TaskQuery q, string? userId, DateOnly today,
        int periodDays, string? completionScope)
    {
        var query = ApplyScope(source, userId);
        var search = q.Search?.Trim();
        if (search is { Length: > 0 })
        {
            query = query.Where(t =>
                t.TaskTitle.Contains(search)
                || (t.TaskDescription != null && t.TaskDescription.Contains(search))
                || (t.SourceEntityID != null && t.SourceEntityID.Contains(search))
                || t.TaskID.ToString().Contains(search));
        }

        var statuses = Normalize(q.Status);
        if (statuses.Length > 0) query = query.Where(t => statuses.Contains(t.Status));

        var priorities = Normalize(q.Priority);
        if (priorities.Length > 0) query = query.Where(t => priorities.Contains(t.Priority));

        var sources = Normalize(q.SourceType);
        if (sources.Length > 0) query = query.Where(t => sources.Contains(t.SourceType));
        var states = Normalize(q.State);
        if (states.Length > 0)
        {
            var late = states.Contains("LATE");
            var todayState = states.Contains("TODAY");
            var soon = states.Contains("SOON");
            var soonUntil = today.AddDays(3);

            query = query.Where(t =>
                (t.Status == "OPEN" || t.Status == "IN_PROGRESS") &&
                ((late && t.DueDate < today)
                 || (todayState && t.DueDate == today)
                 || (soon && t.DueDate > today && t.DueDate <= soonUntil)));
        }

        if (q.TeamID is { } teamId) query = query.Where(t => t.TeamID == teamId);

        var assignee = q.AssignedUserID?.Trim();
        if (assignee is { Length: > 0 })
            query = query.Where(t => t.AssignedUserID == assignee);

        if (q.MineOnly && !string.IsNullOrWhiteSpace(userId))
        {
            var me = userId;
            query = query.Where(t => t.AssignedUserID == me);
        }

        if (q.OverdueOnly)
            query = query.Where(t =>
                (t.Status == "OPEN" || t.Status == "IN_PROGRESS") && t.DueDate < today);

        if (ParseDay(q.DueFrom) is { } dueFrom) query = query.Where(t => t.DueDate >= dueFrom);
        if (ParseDay(q.DueTo) is { } dueTo) query = query.Where(t => t.DueDate <= dueTo);
        query = ApplyCompletionScope(query, completionScope, today);

        query = ApplyMetricFocus(query, q.MetricFocus, today, periodDays);

        return query;
    }

    /// <summary>
    /// "תקופת מדדי ההשלמה":
    /// LAST_7 / LAST_30 / LAST_90 = רק משימות שהושלמו בתוך התקופה;
    /// ALL = כל המשימות שהושלמו, בלי הגבלת תאריך;
    /// בחירה חסרה (null / ריק) = כל המשימות, ללא סינון.
    /// </summary>
    private static IQueryable<CtrlTask> ApplyCompletionScope(
        IQueryable<CtrlTask> query, string? scope, DateOnly today)
    {
        var normalized = scope?.Trim().ToUpperInvariant();

        var days = normalized switch
        {
            "LAST_7" => 7,
            "LAST_30" => 30,
            "LAST_90" => 90,
            _ => 0
        };

        if (string.IsNullOrEmpty(normalized)) return query;

        var completedOnly = query.Where(t => t.Status == "COMPLETED" && t.CompletedDate != null);

        if (days == 0) return completedOnly;

        var fromUtc = today.AddDays(-days).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        return completedOnly.Where(t => t.CompletedDate >= fromUtc);
    }

    private static IQueryable<CtrlTask> ApplyMetricFocus(
        IQueryable<CtrlTask> query, string? metricFocus, DateOnly today, int periodDays)
    {
        var fromUtc = today.AddDays(-periodDays).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        return metricFocus?.Trim().ToUpperInvariant() switch
        {
            "OPEN" => query.Where(t => t.Status == "OPEN" || t.Status == "IN_PROGRESS"),
            "PROGRESS" => query.Where(t => t.Status == "IN_PROGRESS"),
            "LATE" => query.Where(t =>
                (t.Status == "OPEN" || t.Status == "IN_PROGRESS") && t.DueDate < today),
            "HIGH" => query.Where(t =>
                (t.Status == "OPEN" || t.Status == "IN_PROGRESS")
                && (t.Priority == "HIGH" || t.Priority == "URGENT")),
            "COMPLETED" => query.Where(t =>
                t.Status == "COMPLETED" && t.CompletedDate != null && t.CompletedDate >= fromUtc),
            "LATE_COMPLETED" => query.Where(t =>
                t.Status == "COMPLETED" && t.CompletedDate != null && t.CompletedDate >= fromUtc
                && DateOnly.FromDateTime(t.CompletedDate.Value) > t.DueDate),
            _ => query
        };
    }

    private static IOrderedQueryable<CtrlTask> ApplySort(
        IQueryable<CtrlTask> source, TaskQuery q)
    {
        var asc = !string.Equals(q.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var today = TodayInIsrael();

        if (string.Equals(q.SortKey, "DueDate", StringComparison.OrdinalIgnoreCase))
        {
            return asc
                ? source.OrderBy(t => (t.Status == "OPEN" || t.Status == "IN_PROGRESS") && t.DueDate < today ? 0 : 1)
                        .ThenBy(t => t.DueDate).ThenBy(t => t.TaskID)
                : source.OrderByDescending(t => (t.Status == "OPEN" || t.Status == "IN_PROGRESS") && t.DueDate < today ? 0 : 1)
                        .ThenByDescending(t => t.DueDate).ThenBy(t => t.TaskID);
        }

        var ordered = (q.SortKey?.Trim()) switch
        {
            "TaskID" => asc
                ? source.OrderBy(t => t.TaskID)
                : source.OrderByDescending(t => t.TaskID),
            "TaskTitle" => asc
                ? source.OrderBy(t => t.TaskTitle)
                : source.OrderByDescending(t => t.TaskTitle),
            "SourceType" => asc
                ? source.OrderBy(t => t.SourceType)
                : source.OrderByDescending(t => t.SourceType),
            "TeamID" => asc
                ? source.OrderBy(t => t.TeamID)
                : source.OrderByDescending(t => t.TeamID),
            "AssignedUserID" => asc
                ? source.OrderBy(t => t.AssignedUserID)
                : source.OrderByDescending(t => t.AssignedUserID),
            "Priority" => asc
                ? source.OrderBy(t => t.Priority)
                : source.OrderByDescending(t => t.Priority),
            "Status" => asc
                ? source.OrderBy(t => t.Status)
                : source.OrderByDescending(t => t.Status),
            "CreatedDate" => asc
                ? source.OrderBy(t => t.CreatedDate)
                : source.OrderByDescending(t => t.CreatedDate),
            _ => source.OrderByDescending(t => t.CreatedDate)
        };

        return ordered.ThenBy(t => t.TaskID);
    }

    private static DateOnly TodayInIsrael() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IsraelTimeZone));

    private static int NormalizePeriod(int? period) =>
        Math.Clamp(period ?? 30, 1, 365);

    private static int ClampTake(int? take) =>
        Math.Clamp(take ?? 20, 1, 200);

    private static string[] Normalize(string[]? values) =>
        values is null
            ? Array.Empty<string>()
            : values.Where(v => !string.IsNullOrWhiteSpace(v))
                    .Select(v => v.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
    private static DateOnly? ParseDay(string? value) =>
        DateOnly.TryParseExact(value?.Trim(), "yyyy-MM-dd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day
            : null;
    private static bool IsNewSince(CtrlTask t, DateTime? lastViewed)
    {
        if (lastViewed is null) return true;
        return t.CreatedDate > lastViewed.Value
            || (t.UpdatedDate is { } updated && updated > lastViewed.Value);
    }
    [HttpPost("{id:long}/view")]
    public async Task<IActionResult> MarkViewed(long id, CancellationToken ct)
    {
        var userId = currentUser.Id;
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "נדרשת התחברות" });

        var exists = await context.CtrlTasks.AnyAsync(t => t.TaskID == id, ct);
        if (!exists) return NotFound(new { message = "המשימה לא נמצאה" });

        var now = DateTime.UtcNow;
        var row = await context.CtrlTaskViews
            .FirstOrDefaultAsync(v => v.TaskID == id && v.UserID == userId, ct);

        if (row is null)
        {
            context.CtrlTaskViews.Add(new CtrlTaskView
            {
                TaskID = id,
                UserID = userId,
                LastViewedDate = now
            });
        }
        else if (row.LastViewedDate < now)
        {
            row.LastViewedDate = now;
        }

        await context.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("lookups")]
    [ProducesResponseType(typeof(TaskLookupsDto), StatusCodes.Status200OK)]
    public Task<TaskLookupsDto> GetLookups(CancellationToken cancellationToken)
    {
        var dto = new TaskLookupsDto
        {
            Teams = TaskCatalog.ActiveTeamIds
                .Select(id => new LookupItemDto
                {
                    Value = id.ToString(CultureInfo.InvariantCulture),
                    Label = TaskCatalog.TeamLabel(id)
                })
                .ToList(),

            People = TaskCatalog.People
                .Select(kv => new LookupItemDto
                {
                    Value = kv.Key,
                    Label = kv.Key,
                    TeamID = kv.Value.TeamId
                })
                .ToList()
        };

        return Task.FromResult(dto);
    }
    [HttpGet("{id:long}/comments")]
    public async Task<List<CommentDto>> GetComments(long id, CancellationToken ct)
    {
        return await context.CtrlTaskComments
            .AsNoTracking()
            .Where(c => c.TaskID == id)
            .OrderByDescending(c => c.CreatedDate)
            .ThenByDescending(c => c.CommentID)
            .Select(c => new CommentDto
            {
                CommentID = c.CommentID,
                TaskID = c.TaskID,
                CommentText = c.CommentText,
                CreatedBy = c.CreatedBy,
                CreatedDate = c.CreatedDate.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
            })
            .ToListAsync(ct);
    }
    [HttpGet("{id:long}/history")]
    public async Task<List<HistoryDto>> GetHistory(long id, CancellationToken ct)
    {
        return await context.CtrlTaskHistories
            .AsNoTracking()
            .Where(h => h.TaskID == id)
            .OrderByDescending(h => h.ChangedDate)
            .ThenByDescending(h => h.HistoryID)
            .Select(h => new HistoryDto
            {
                HistoryID = h.HistoryID,
                TaskID = h.TaskID,
                ActionType = h.ActionType,
                FieldName = h.FieldName,
                OldValue = h.OldValue,
                NewValue = h.NewValue,
                ChangedBy = h.ChangedBy,
                ChangedDate = h.ChangedDate.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
            })
            .ToListAsync(ct);
    }
    [HttpPut("{id:long}")]
    public async Task<ActionResult<TaskDto>> Update(long id, UpdateTaskRequest request, CancellationToken ct)
    {
        if (!CanModifyTasks()) return Forbidden403();

        var task = await context.CtrlTasks.FirstOrDefaultAsync(t => t.TaskID == id, ct);
        if (task is null) return NotFound(new { message = "המשימה לא נמצאה" });

        if (!TryApplyRowVersion(task, request.RowVersion, out _))
            return Conflict(new { message = ConcurrencyMessage });

        if (task.Status is not ("OPEN" or "IN_PROGRESS"))
            return Conflict(new { message = "אין לערוך משימה שאינה פעילה" });

        var title = request.TaskTitle?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(title))
            return BadRequest(new { message = "יש למלא נושא משימה" });

        if (title.Length > 150)
            return BadRequest(new { message = "נושא המשימה ארוך מדי (עד 150 תווים)" });

        if (request.TaskDescription is { Length: > 2000 })
            return BadRequest(new { message = "תיאור המשימה ארוך מדי (עד 2000 תווים)" });

        if (!ActiveTeamIds.Contains(request.TeamID))
            return BadRequest(new { message = "יש לבחור צוות מטפל" });

        if (request.Priority is not ("LOW" or "MEDIUM" or "HIGH" or "URGENT"))
            return BadRequest(new { message = "עדיפות אינה חוקית" });

        var assignedUserId = string.IsNullOrWhiteSpace(request.AssignedUserID)
            ? null
            : request.AssignedUserID.Trim();

        if (assignedUserId is { Length: > 128 })
            return BadRequest(new { message = "מזהה העובד ארוך מדי (עד 128 תווים)" });

        if (!IsValidAssignee(assignedUserId, request.TeamID))
            return BadRequest(new { message = "העובד שנבחר אינו פעיל או אינו משויך לצוות שנבחר" });

        if (!DateOnly.TryParseExact(request.DueDate, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var due))
            return BadRequest(new { message = "תאריך יעד אינו חוקי (נדרש yyyy-MM-dd)" });

        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow, IsraelTimeZone));

        if (due < today)
            return BadRequest(new { message = "תאריך יעד לא יכול להיות מוקדם מהיום" });

        var old = new
        {
            task.TaskTitle,
            task.TaskDescription,
            task.TeamID,
            task.AssignedUserID,
            task.Priority,
            DueDate = task.DueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
        };

        task.TaskTitle = title;
        task.TaskDescription = string.IsNullOrWhiteSpace(request.TaskDescription)
            ? null
            : request.TaskDescription.Trim();
        task.TeamID = request.TeamID;
        task.AssignedUserID = assignedUserId;
        task.Priority = request.Priority;
        task.DueDate = due;
        task.UpdatedBy = currentUser.Id;
        task.UpdatedDate = DateTime.UtcNow;

        var history = new List<CtrlTaskHistory>();

        void Track(string field, object? before, object? after)
        {
            var b = before?.ToString() ?? string.Empty;
            var a = after?.ToString() ?? string.Empty;
            if (b == a) return;

            history.Add(new CtrlTaskHistory
            {
                TaskID = id,
                ActionType = field is "TeamID" or "AssignedUserID" ? "REASSIGN" : "UPDATE",
                FieldName = field,
                OldValue = b.Length == 0 ? null : b,
                NewValue = a.Length == 0 ? null : a,
                ChangedBy = currentUser.Id ?? string.Empty,
                ChangedDate = DateTime.UtcNow
            });
        }

        Track("TaskTitle", old.TaskTitle, task.TaskTitle);
        Track("TaskDescription", old.TaskDescription, task.TaskDescription);
        Track("TeamID", old.TeamID, task.TeamID);
        Track("AssignedUserID", old.AssignedUserID, task.AssignedUserID);
        Track("Priority", old.Priority, task.Priority);
        Track("DueDate", old.DueDate, request.DueDate);

        if (history.Count == 0) return Ok(ToDto(task));

        await using var tx = await context.Database.BeginTransactionAsync(ct);

        try
        {
            context.CtrlTaskHistories.AddRange(history);
            await context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            return Conflict(new { message = ConcurrencyMessage });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }

        return Ok(ToDto(task));
    }

    [HttpPut("{id:long}/status")]
    public async Task<ActionResult<TaskDto>> ChangeStatus(
        long id, ChangeStatusRequest request, CancellationToken ct)
    {
        if (!CanModifyTasks()) return Forbidden403();

        var task = await context.CtrlTasks.FirstOrDefaultAsync(t => t.TaskID == id, ct);
        if (task is null) return NotFound(new { message = "המשימה לא נמצאה" });

        if (!TryApplyRowVersion(task, request.RowVersion, out _))
            return Conflict(new { message = ConcurrencyMessage });

        var target = request.Status?.Trim() ?? string.Empty;

        var allowed = task.Status switch
        {
            "OPEN" => new[] { "IN_PROGRESS", "COMPLETED", "CANCELLED" },
            "IN_PROGRESS" => new[] { "OPEN", "COMPLETED", "CANCELLED" },
            "COMPLETED" => new[] { "OPEN" },
            "CANCELLED" => new[] { "OPEN" },
            _ => Array.Empty<string>()
        };

        if (!allowed.Contains(target))
            return Conflict(new { message = "מעבר הסטטוס אינו מורשה" });

        if (task.Status == target) return Ok(ToDto(task));

        var before = task.Status;
        var now = DateTime.UtcNow;

        var oldCompleted = task.CompletedDate;
        var oldCancelled = task.CancelledDate;

        task.Status = target;
        task.UpdatedBy = currentUser.Id;
        task.UpdatedDate = now;

        task.CompletedDate = target == "COMPLETED" ? now : null;
        task.CancelledDate = target == "CANCELLED" ? now : null;

        var history = new List<CtrlTaskHistory>
        {
            new()
            {
                TaskID = id,
                ActionType = "STATUS_CHANGE",
                FieldName = "Status",
                OldValue = before,
                NewValue = target,
                ChangedBy = currentUser.Id ?? string.Empty,
                ChangedDate = now
            }
        };

        TrackClosingDate(history, id, "CompletedDate", oldCompleted, task.CompletedDate, now);
        TrackClosingDate(history, id, "CancelledDate", oldCancelled, task.CancelledDate, now);
        await using var tx = await context.Database.BeginTransactionAsync(ct);

        try
        {
            context.CtrlTaskHistories.AddRange(history);
            await context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync(ct);
            return Conflict(new { message = ConcurrencyMessage });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }

        return Ok(ToDto(task));
    }
    [HttpPost("{id:long}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(
        long id, AddCommentRequest request, CancellationToken ct)
    {
        if (!CanModifyTasks()) return Forbidden403();
        var exists = await context.CtrlTasks.AnyAsync(t => t.TaskID == id, ct);
        if (!exists) return NotFound(new { message = "המשימה לא נמצאה" });
        var text = request.CommentText?.Trim() ?? string.Empty;
        if (text.Length == 0)
            return BadRequest(new { message = "יש להזין תוכן הערה" });
        if (text.Length > 2000)
            return BadRequest(new { message = "ההערה ארוכה מדי (עד 2000 תווים)" });
        var comment = new CtrlTaskComment
        {
            TaskID = id,
            CommentText = text,
            CreatedBy = currentUser.Id ?? "unknown",
            CreatedDate = DateTime.UtcNow
        };

        context.CtrlTaskComments.Add(comment);
        await context.SaveChangesAsync(ct);

        return Ok(new CommentDto
        {
            CommentID = comment.CommentID,
            TaskID = comment.TaskID,
            CommentText = comment.CommentText,
            CreatedBy = comment.CreatedBy,
            CreatedDate = comment.CreatedDate.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
        });
    }
    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create(CreateTaskRequest request, CancellationToken ct)
    {
        var userId = currentUser.Id;
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "נדרשת התחברות" });
        var title = request.TaskTitle?.Trim() ?? string.Empty;
        if (title.Length == 0)
            return BadRequest(new { message = "יש למלא נושא משימה" });
        if (title.Length > 150)
            return BadRequest(new { message = "נושא המשימה ארוך מדי (עד 150 תווים)" });
        if (request.TaskDescription is { Length: > 2000 })
            return BadRequest(new { message = "תיאור המשימה ארוך מדי (עד 2000 תווים)" });
        if (!ActiveTeamIds.Contains(request.TeamID))
            return BadRequest(new { message = "יש לבחור צוות מטפל פעיל" });
        if (!CanAssignToTeam(request.TeamID))
            return BadRequest(new { message = "אין הרשאה לשייך משימה לצוות זה" });
        var assignedUserId = string.IsNullOrWhiteSpace(request.AssignedUserID)
            ? null
            : request.AssignedUserID.Trim();
        if (assignedUserId is { Length: > 128 })
            return BadRequest(new { message = "מזהה העובד ארוך מדי (עד 128 תווים)" });
        if (!IsValidAssignee(assignedUserId, request.TeamID))
            return BadRequest(new { message = "העובד שנבחר אינו פעיל או אינו משויך לצוות שנבחר" });
        if (request.Priority is not ("LOW" or "MEDIUM" or "HIGH" or "URGENT"))
            return BadRequest(new { message = "עדיפות אינה חוקית" });

        if (!DateOnly.TryParseExact(request.DueDate, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var due))
            return BadRequest(new { message = "תאריך יעד אינו חוקי (נדרש yyyy-MM-dd)" });

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, IsraelTimeZone));

        if (due < today)
            return BadRequest(new { message = "תאריך יעד לא יכול להיות מוקדם מתאריך היצירה" });
        var hasAnySource = !string.IsNullOrWhiteSpace(request.SourceSystemCode)
            || !string.IsNullOrWhiteSpace(request.SourceEntityType)
            || !string.IsNullOrWhiteSpace(request.SourceEntityID);
        if (hasAnySource)
        {
            if (string.IsNullOrWhiteSpace(request.SourceSystemCode)
                || string.IsNullOrWhiteSpace(request.SourceEntityType)
                || string.IsNullOrWhiteSpace(request.SourceEntityID))
                return BadRequest(new { message = "קישור לרשומה מחייב מערכת מקור, סוג ישות ומזהה ישות" });
            if (request.SourceSystemCode!.Trim().Length > 100)
                return BadRequest(new { message = "קוד מערכת המקור ארוך מדי (עד 100 תווים)" });

            if (request.SourceEntityType!.Trim().Length > 128)
                return BadRequest(new { message = "סוג הישות ארוך מדי (עד 128 תווים)" });
            if (request.SourceEntityID!.Trim().Length > 150)
                return BadRequest(new { message = "מזהה הישות ארוך מדי (עד 150 תווים)" });
        }
        if (request.SourceURL is { Length: > 2048 })
            return BadRequest(new { message = "כתובת המקור ארוכה מדי (עד 2048 תווים)" });
        if (request.MetricID is int metricId
            && !await context.CtrlMetrics.AnyAsync(m => m.MetricID == metricId, ct))
            return BadRequest(new { message = "הנתון שנבחר אינו קיים" });
        var task = new CtrlTask
        {
            TaskTitle = title,
            TaskDescription = string.IsNullOrWhiteSpace(request.TaskDescription)
                ? null
                : request.TaskDescription.Trim(),
            TeamID = request.TeamID,
            AssignedUserID = assignedUserId,
            Priority = request.Priority,
            Status = "OPEN",
            DueDate = due,
            SourceType = hasAnySource ? "EXTERNAL" : "MANUAL",
            SourceSystemCode = hasAnySource ? request.SourceSystemCode!.Trim() : null,
            SourceEntityType = hasAnySource ? request.SourceEntityType!.Trim() : null,
            SourceEntityID = hasAnySource ? request.SourceEntityID!.Trim() : null,
            SourceURL = string.IsNullOrWhiteSpace(request.SourceURL) ? null : request.SourceURL.Trim(),
            MetricID = request.MetricID,
            CreatedBy = userId,
            CreatedDate = now
        };
        await using var tx = await context.Database.BeginTransactionAsync(ct);
        try
        {
            context.CtrlTasks.Add(task);
            await context.SaveChangesAsync(ct);
            context.CtrlTaskHistories.Add(new CtrlTaskHistory
            {
                TaskID = task.TaskID,
                ActionType = "CREATE",
                FieldName = null,
                OldValue = null,
                NewValue = title,
                ChangedBy = userId,
                ChangedDate = now
            });
            await context.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
        return Ok(ToDto(task));
    }
    private static bool TryApplyRowVersion(CtrlTask task, string? rowVersionBase64, out byte[] bytes)
    {
        bytes = Array.Empty<byte>();
        if (string.IsNullOrWhiteSpace(rowVersionBase64)) return true;

        try
        {
            bytes = Convert.FromBase64String(rowVersionBase64);
        }
        catch (FormatException)
        {
            return false;
        }

        return bytes.AsSpan().SequenceEqual(task.RowVersion);
    }

    private const string ConcurrencyMessage =
        "פרטי המשימה עודכנו על ידי משתמש אחר. יש לרענן את הנתונים ולנסות שוב";
    private void TrackClosingDate(
        List<CtrlTaskHistory> history,
        long taskId,
        string fieldName,
        DateTime? before,
        DateTime? after,
        DateTime changedDate)
    {
        if (before == after) return;
        if (before is { } b && after is { } a && b == a) return;

        history.Add(new CtrlTaskHistory
        {
            TaskID = taskId,
            ActionType = "STATUS_CHANGE",
            FieldName = fieldName,
            OldValue = before?.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
            NewValue = after?.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
            ChangedBy = currentUser.Id ?? string.Empty,
            ChangedDate = changedDate
        });
    }
    private static TaskDto ToDto(CtrlTask t) => new()
    {
        TaskID = t.TaskID,
        TaskTitle = t.TaskTitle,
        TaskDescription = t.TaskDescription,
        TeamID = t.TeamID,
        AssignedUserID = t.AssignedUserID,
        Priority = t.Priority,
        Status = t.Status,
        DueDate = t.DueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        CompletedDate = t.CompletedDate?.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
        CancelledDate = t.CancelledDate?.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
        SourceType = t.SourceType,
        SourceSystemCode = t.SourceSystemCode,
        SourceEntityType = t.SourceEntityType,
        SourceEntityID = t.SourceEntityID,
        SourceURL = t.SourceURL,
        MetricID = t.MetricID,
        CreatedBy = t.CreatedBy,
        CreatedDate = t.CreatedDate.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
        UpdatedBy = t.UpdatedBy,
        UpdatedDate = t.UpdatedDate?.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture),
        RowVersion = Convert.ToBase64String(t.RowVersion)
    };
}
public class CreateTaskRequest
{
    public string TaskTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public int TeamID { get; set; }
    public string? AssignedUserID { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string DueDate { get; set; } = string.Empty;
    public string? SourceSystemCode { get; set; }
    public string? SourceEntityType { get; set; }
    public string? SourceEntityID { get; set; }
    public string? SourceURL { get; set; }
    public int? MetricID { get; set; }
}

public class TaskDto
{
    public long TaskID { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public int TeamID { get; set; }
    public string? AssignedUserID { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string DueDate { get; set; } = string.Empty;
    public string? CompletedDate { get; set; }
    public string? CancelledDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? SourceSystemCode { get; set; }
    public string? SourceEntityType { get; set; }
    public string? SourceEntityID { get; set; }
    public string? SourceURL { get; set; }
    public int? MetricID { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string CreatedDate { get; set; } = string.Empty;
    public string? UpdatedBy { get; set; }
    public string? UpdatedDate { get; set; }
    public string RowVersion { get; set; } = string.Empty;
    public bool IsNewForMe { get; set; }
}

public class CommentDto
{
    public long CommentID { get; set; }
    public long TaskID { get; set; }
    public string CommentText { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public string CreatedDate { get; set; } = string.Empty;
}

public class HistoryDto
{
    public long HistoryID { get; set; }
    public long TaskID { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public string ChangedDate { get; set; } = string.Empty;
}

public class UpdateTaskRequest
{
    public string TaskTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public int TeamID { get; set; }
    public string? AssignedUserID { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string DueDate { get; set; } = string.Empty;
    public string? RowVersion { get; set; }
}

public class ChangeStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? RowVersion { get; set; }
}

public class AddCommentRequest
{
    public string CommentText { get; set; } = string.Empty;
}
