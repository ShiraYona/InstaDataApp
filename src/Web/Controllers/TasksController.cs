using System.Globalization;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Domain.Entities;
using InstaDataApp.Web.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Web.Controllers;

/// <summary>
/// משימות ובקרה. כל הפעולות דורשות משתמש מזוהה;
/// הרשאות פרטניות לפעולות שינוי נבדקות בכל פעולה.
/// </summary>
[Microsoft.AspNetCore.Authorization.Authorize]
[ApiController]
[Route("api/[controller]")]
public class TasksController(IApplicationDbContext context, IUser currentUser) : ControllerBase
{
    private static readonly TimeZoneInfo IsraelTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("Israel Standard Time");

    /// <summary>הצוותים הפעילים — לשייך משימה רק אליהם.</summary>
    private static IReadOnlyList<int> ActiveTeamIds => TaskCatalog.ActiveTeamIds;

    /// <summary>העובד שנבחר חייב להיות פעיל ולהשתייך לצוות שנבחר.</summary>
    private static bool IsValidAssignee(string? userId, int teamId) =>
        TaskCatalog.IsValidAssignee(userId, teamId);

    /// <summary>
    /// האם המשתמש הנוכחי רשאי לשייך משימה לצוות הזה.
    /// TODO(7.1.1): להחליף בבדיקת תפקיד אמיתית מה-DB.
    /// </summary>
    private bool CanAssignToTeam(int teamId)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id)) return false;
        return TaskCatalog.IsActiveTeam(teamId);
    }

    /// <summary>
    /// האם המשתמש הנוכחי רשאי לשנות משימות (עריכה, שינוי סטטוס, תגובה).
    /// כרגע: כל משתמש מזוהה — עד שתתוסף טבלת תפקידים.
    /// TODO: לצמצם לתפקידי מנהל / אחראי צוות לפי 7.1.1.
    /// </summary>
    private bool CanModifyTasks() => !string.IsNullOrWhiteSpace(currentUser.Id);

    /// <summary>תגובת 403 אחידה כשאין הרשאה.</summary>
    private static ObjectResult Forbidden403() =>
        new(new { message = "אין הרשאה לביצוע הפעולה" }) { StatusCode = StatusCodes.Status403Forbidden };

    /* ===================== קריאה ===================== */

    /// <summary>
    /// רשימת המשימות — סינון, מיון ודפדוף בצד השרת (7.3.1).
    /// הסינון והמיון מתבצעים ב-SQL; רק העמוד המבוקש נטען לזיכרון.
    /// </summary>
    [HttpGet]
    public async Task<List<TaskDto>> GetAll([FromQuery] TaskQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id;

        // TODO(7.1.1): כשהזהות תהיה אמיתית — להסיר את ההחלפה ולהסתמך רק על currentUser.
        // בזמן פיתוח הזהות היא "dev-user-1" ולכן "המשימות שלי" היה ריק תמיד;
        // עבור משתמש הפיתוח בלבד, סינון "שלי" לפי AssignedUserID שהתקבל במפורש
        // משמש כתצוגה מקדימה של התנהגות הסינון.
        if (query.MineOnly
            && string.Equals(currentUser.Id, Web.Services.CurrentUser.DevelopmentUserId, StringComparison.Ordinal)
            && query.AssignedUserID is { Length: > 0 } explicitUser)
        {
            userId = explicitUser.Trim();
        }

        var today = TodayInIsrael();

        var filtered = ApplyQuery(context.CtrlTasks.AsNoTracking(), query, userId, today, NormalizePeriod(query.Period));
        var tasks = await ApplySort(filtered, query)
            .Skip(query.Skip is > 0 ? query.Skip.Value : 0)
            .Take(ClampTake(query.Take))
            .ToListAsync(ct);

        if (tasks.Count == 0) return new List<TaskDto>();

        // מועדי הצפייה האחרונים של המשתמש — בעמוד הנוכחי בלבד.
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

    /// <summary>
    /// משימה בודדת לפי מזהה (7.4.1) — לפתיחת מסך פרטים ישירות,
    /// בלי להסתמך על כך שהמשימה נטענה קודם ברשימה.
    /// מוחזר גם סימון הצפייה של המשתמש, כמו ברשימה.
    /// </summary>
    [HttpGet("{id:long}")]
    public async Task<ActionResult<TaskDto>> GetById(long id, CancellationToken ct)
    {
        // בדיקת ההרשאה מתבצעת על אותו scope של הרשימה, כדי שלא ניתן יהיה
        // לשלוף משימה מחוץ לטווח המורשה.
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

    /// <summary>
    /// מספר הרשומות המתאימות לאותה שאילתה — לתצוגת "מוצגות X מתוך Y".
    /// נשלח בנפרד מבקשת הרשימה; השניים נשלחים יחד ולכן תמיד מתייחסים לאותו סינון.
    /// </summary>
    [HttpGet("count")]
    public async Task<int> GetCount([FromQuery] TaskQuery query, CancellationToken ct)
    {
        var filtered = ApplyQuery(context.CtrlTasks.AsNoTracking(), query, currentUser.Id, TodayInIsrael(), NormalizePeriod(query.Period));
        return await filtered.CountAsync(ct);
    }

    /// <summary>
    /// מדדי התצוגה העליונה (7.3.1). מחושבים על קבוצת הנתונים שהמשתמש רשאי לראות,
    /// בלי סינון הטבלה — כדי שהמדדים לא ישתנו כשמסננים שורה.
    /// </summary>
    [HttpGet("metrics")]
    public async Task<TaskMetricsDto> GetMetrics([FromQuery] int? period, CancellationToken ct)
    {
        var userId = currentUser.Id;
        var today = TodayInIsrael();
        var from = today.AddDays(-NormalizePeriod(period));

        // תאריך יעד כ-DateOnly מול date ב-SQL — השוואה ישירה, בלי המרות בזיכרון.
        var todayOnly = today;
        var fromUtc = from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var scope = ApplyScope(context.CtrlTasks.AsNoTracking(), userId);

        var completed = scope.Where(t => t.Status == "COMPLETED" && t.CompletedDate != null);

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
            Completed = await completed.CountAsync(t => t.CompletedDate >= fromUtc, ct),
            CompletedOnTime = await completed.CountAsync(
                t => t.CompletedDate >= fromUtc
                     && DateOnly.FromDateTime(t.CompletedDate!.Value) <= t.DueDate, ct),
            Total = await scope.CountAsync(ct)
        };

        return metrics;
    }

    /// <summary>
    /// הגדרת קבוצת הנתונים שהמשתמש רשאי לראות.
    /// TODO: כשטבלת התפקידים תגיע מה-DB — לצמצם כאן לפי 7.1.1:
    /// מנהל רואה הכול, מנהל צוות רואה את צוותו, עובד רואה את משימותיו.
    /// </summary>
    private static IQueryable<CtrlTask> ApplyScope(IQueryable<CtrlTask> source, string? userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return source.Where(_ => false);

        return source;
    }

    /// <summary>
    /// סינון לפי שאילתת המשתמש. OR בתוך כל מסנן, AND בין מסננים שונים.
    /// שוויון על מחרוזות מתבצע ב-SQL עם collation שאינו מבחין בין רישיות.
    /// </summary>
    private static IQueryable<CtrlTask> ApplyQuery(
        IQueryable<CtrlTask> source, TaskQuery q, string? userId, DateOnly today, int periodDays)
    {
        var query = ApplyScope(source, userId);

        // חיפוש חופשי — מזהה, נושא, תיאור או מזהה ישות. toString במפורש
        // כדי שלא ייפול לתלות ב-collation של מספרים.
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

        // מצב טיפול — תואם להגדרת התג בטבלה:
        // LATE = פעילה שעבר תאריך היעד; TODAY = פעילה שהיעד שלה היום;
        // SOON = פעילה שהיעד שלה קרוב (עד 3 ימים, לא כולל היום).
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

        // מדד סיכום שנבחר (7.3.3.5) — מסנן נוסף מעל הבחירות של המשתמש, לפי אוכלוסיית המדד.
        // לא דורס את סינון הסטטוס/עדיפות: שניהם חלים יחד (AND).
        query = ApplyMetricFocus(query, q.MetricFocus, today, periodDays);

        return query;
    }

    /// <summary>
    /// סינון לפי מדד סיכום — אותה הגדרה שבחישוב המדדים (GetMetrics).
    /// ערך לא מוכר מתעלמים ממנו, כדי לא להפיל את השאילתה.
    /// </summary>
    private static IQueryable<CtrlTask> ApplyMetricFocus(
        IQueryable<CtrlTask> query, string? metricFocus, DateOnly today, int periodDays)
    {
        // אותה נקודת התחלה של התקופה שמשמשת ב-GetMetrics.
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
            // "הושלמו" ו"השלמה במועד" — משימות שהושלמו בתקופה שנבחרה.
            "COMPLETED" => query.Where(t =>
                t.Status == "COMPLETED" && t.CompletedDate != null && t.CompletedDate >= fromUtc),
            "LATE_COMPLETED" => query.Where(t =>
                t.Status == "COMPLETED" && t.CompletedDate != null && t.CompletedDate >= fromUtc
                && DateOnly.FromDateTime(t.CompletedDate.Value) > t.DueDate),
            _ => query
        };
    }

    /// <summary>
    /// מיון בצד השרת. ה"באיחור קודם" של מיון תאריך יעד נשמר —
    /// ואחריו תמיד TaskID כשובר שוויון, כדי שהדפדוף יהיה יציב.
    /// </summary>
    private static IOrderedQueryable<CtrlTask> ApplySort(
        IQueryable<CtrlTask> source, TaskQuery q)
    {
        var asc = !string.Equals(q.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var today = TodayInIsrael();

        if (string.Equals(q.SortKey, "DueDate", StringComparison.OrdinalIgnoreCase))
        {
            // מפתח מיון עוזר: 0 = פעילה שעבר תאריך היעד, 1 = אחרות.
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
            // ברירת מחדל: החדשות קודם
            _ => source.OrderByDescending(t => t.CreatedDate)
        };

        return ordered.ThenBy(t => t.TaskID);
    }

    /* ===================== עזרי שאילתה ===================== */

    /// <summary>היום לפי השעון בישראל — תאריך יעד נמדד לפי יום מקומי, לא UTC.</summary>
    private static DateOnly TodayInIsrael() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IsraelTimeZone));

    /// <summary>חלון החישוב למדדים — ברירת מחדל 30 יום, בין 1 ל-365.</summary>
    private static int NormalizePeriod(int? period) =>
        Math.Clamp(period ?? 30, 1, 365);

    /// <summary>גודל עמוד — ברירת מחדל 20, מקסימום 200 (הגנה מפני שליפת הכול).</summary>
    private static int ClampTake(int? take) =>
        Math.Clamp(take ?? 20, 1, 200);

    /// <summary>
    /// ערכי מסנן מרובי-בחירה: ניקוי רווחים, איחוד, וביטול תווים שאינם ערך חוקי.
    /// </summary>
    private static string[] Normalize(string[]? values) =>
        values is null
            ? Array.Empty<string>()
            : values.Where(v => !string.IsNullOrWhiteSpace(v))
                    .Select(v => v.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

    /// <summary>תאריך בפורמט yyyy-MM-dd — ערך לא חוקי מתעלם (לא מפיל את השאילתה).</summary>
    private static DateOnly? ParseDay(string? value) =>
        DateOnly.TryParseExact(value?.Trim(), "yyyy-MM-dd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day
            : null;

    /// <summary>
    /// משימה נחשבת "חדשה" כשלא צפו בה מעולם, או שנוצרה/עודכנה אחרי הצפייה האחרונה (7.3.1).
    /// </summary>
    private static bool IsNewSince(CtrlTask t, DateTime? lastViewed)
    {
        if (lastViewed is null) return true;
        return t.CreatedDate > lastViewed.Value
            || (t.UpdatedDate is { } updated && updated > lastViewed.Value);
    }

    /// <summary>
    /// סימון "צפיתי במשימה" — נקרא מהמסך כשנפתח חלון הפרטים.
    /// upsert: שורה למשתמש או עדכון המועד.
    /// </summary>
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

    /// <summary>
    /// קטלוגי התצוגה — צוותים ועובדים. נקרא כולו מ-<see cref="TaskCatalog"/>;
    /// כשהקטלוג יעבור ל-DB, אין צורך לשנות כאן דבר.
    /// </summary>
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

    /// <summary>הערות טיפול של משימה.</summary>
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

    /// <summary>יומן שינויים של משימה.</summary>
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

    /* ===================== עריכה ===================== */

    /// <summary>עריכת משימה קיימת — נושא, תיאור, צוות, אחראי, עדיפות ותאריך יעד.</summary>
    [HttpPut("{id:long}")]
    public async Task<ActionResult<TaskDto>> Update(long id, UpdateTaskRequest request, CancellationToken ct)
    {
        // הרשאה — 7.1.1
        if (!CanModifyTasks()) return Forbidden403();

        var task = await context.CtrlTasks.FirstOrDefaultAsync(t => t.TaskID == id, ct);
        if (task is null) return NotFound(new { message = "המשימה לא נמצאה" });

        // הגנת עדכון מקביל — 7.4.9.4–5
        if (!TryApplyRowVersion(task, request.RowVersion, out _))
            return Conflict(new { message = ConcurrencyMessage });

        // עריכה מותרת רק במשימה פעילה
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

        // העובד שנבחר חייב להיות פעיל ולהשתייך לצוות שנבחר
        if (!IsValidAssignee(assignedUserId, request.TeamID))
            return BadRequest(new { message = "העובד שנבחר אינו פעיל או אינו משויך לצוות שנבחר" });

        if (!DateOnly.TryParseExact(request.DueDate, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var due))
            return BadRequest(new { message = "תאריך יעד אינו חוקי (נדרש yyyy-MM-dd)" });

        // תאריך יעד לא יכול להיות בעבר — לפי התאריך המקומי בישראל
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.UtcNow, IsraelTimeZone));

        if (due < today)
            return BadRequest(new { message = "תאריך יעד לא יכול להיות מוקדם מהיום" });

        // EF ישמור את ה-RowVersion המקורי של הרשומה; אם מישהו עדכן בינתיים —
        // DbUpdateConcurrencyException. ה-OriginalValue נשאר מה שנקרא מה-DB.
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

        // לא השתנה כלום — לא נוגעים ב-DB ולא רושמים היסטוריה
        if (history.Count == 0) return Ok(ToDto(task));

        // עדכון המשימה ורישום היומן — בעסקה אחת: או שהכול נשמר, או שכלום
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

    /// <summary>שינוי סטטוס משימה — כולל רישום ביומן השינויים.</summary>
    [HttpPut("{id:long}/status")]
    public async Task<ActionResult<TaskDto>> ChangeStatus(
        long id, ChangeStatusRequest request, CancellationToken ct)
    {
        // הרשאה — 7.1.1
        if (!CanModifyTasks()) return Forbidden403();

        var task = await context.CtrlTasks.FirstOrDefaultAsync(t => t.TaskID == id, ct);
        if (task is null) return NotFound(new { message = "המשימה לא נמצאה" });

        // הגנת עדכון מקביל — 7.4.9.4–5
        if (!TryApplyRowVersion(task, request.RowVersion, out _))
            return Conflict(new { message = ConcurrencyMessage });

        var target = request.Status?.Trim() ?? string.Empty;

        // אותם מעברים שמותרים במסך
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

        // מועדי הסגירה הקודמים — נשמרים בהיסטוריה לפני הניקוי
        var oldCompleted = task.CompletedDate;
        var oldCancelled = task.CancelledDate;

        task.Status = target;
        task.UpdatedBy = currentUser.Id;
        task.UpdatedDate = now;

        // תאריכי סגירה — מנוקים כשהמשימה נפתחת מחדש
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

        // תיעוד שינוי מועדי הסגירה — בכל מעבר, לא רק בפתיחה מחדש (7.3.10.6).
        // שלושה מקרים נרשמים: מועד שנוקה (COMPLETED/CANCELLED → OPEN), מועד שנדרס
        // במעבר סגירה חוזר (למשל COMPLETED → OPEN → COMPLETED), ומועד שנוצר.
        TrackClosingDate(history, id, "CompletedDate", oldCompleted, task.CompletedDate, now);
        TrackClosingDate(history, id, "CancelledDate", oldCancelled, task.CancelledDate, now);

        // שינוי הסטטוס ורישום היומן — בעסקה אחת
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

    /// <summary>הוספת הערת טיפול למשימה.</summary>
    [HttpPost("{id:long}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(
        long id, AddCommentRequest request, CancellationToken ct)
    {
        // הרשאה — 7.1.1
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

    /* ===================== יצירה ===================== */

    /// <summary>יצירת משימה חדשה — כולל רישום ביומן השינויים.</summary>
    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create(CreateTaskRequest request, CancellationToken ct)
    {
        // 1) הרשאת משתמש
        var userId = currentUser.Id;
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { message = "נדרשת התחברות" });

        // 2) נושא המשימה — חובה, לא רווחים בלבד, אורך לפי ה-DB
        var title = request.TaskTitle?.Trim() ?? string.Empty;
        if (title.Length == 0)
            return BadRequest(new { message = "יש למלא נושא משימה" });

        if (title.Length > 150)
            return BadRequest(new { message = "נושא המשימה ארוך מדי (עד 150 תווים)" });

        // 3) תיאור — אורך לפי ה-DB
        if (request.TaskDescription is { Length: > 2000 })
            return BadRequest(new { message = "תיאור המשימה ארוך מדי (עד 2000 תווים)" });

        // 4) צוות — פעיל, ובהרשאת המשתמש
        if (!ActiveTeamIds.Contains(request.TeamID))
            return BadRequest(new { message = "יש לבחור צוות מטפל פעיל" });

        if (!CanAssignToTeam(request.TeamID))
            return BadRequest(new { message = "אין הרשאה לשייך משימה לצוות זה" });

        // 5) עובד — פעיל ומשויך לצוות
        var assignedUserId = string.IsNullOrWhiteSpace(request.AssignedUserID)
            ? null
            : request.AssignedUserID.Trim();

        if (assignedUserId is { Length: > 128 })
            return BadRequest(new { message = "מזהה העובד ארוך מדי (עד 128 תווים)" });

        if (!IsValidAssignee(assignedUserId, request.TeamID))
            return BadRequest(new { message = "העובד שנבחר אינו פעיל או אינו משויך לצוות שנבחר" });

        // 6) עדיפות
        if (request.Priority is not ("LOW" or "MEDIUM" or "HIGH" or "URGENT"))
            return BadRequest(new { message = "עדיפות אינה חוקית" });

        // 7) תאריך יעד — פורמט תקין, ולא מוקדם מתאריך היצירה
        if (!DateOnly.TryParseExact(request.DueDate, "yyyy-MM-dd",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var due))
            return BadRequest(new { message = "תאריך יעד אינו חוקי (נדרש yyyy-MM-dd)" });

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(now, IsraelTimeZone));

        if (due < today)
            return BadRequest(new { message = "תאריך יעד לא יכול להיות מוקדם מתאריך היצירה" });

        // 8) מקור — אם קיים קישור לרשומה, שלושת השדות חובה
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

        // 9) MetricID — חייב להתקיים ב-CTRL_Metrics
        // TODO: להחליף את CtrlMetrics בשם ה-DbSet האמיתי ב-IApplicationDbContext
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

        // המשימה ורישום היומן — בעסקה אחת: או שהכול נשמר, או שכלום
        await using var tx = await context.Database.BeginTransactionAsync(ct);

        try
        {
            context.CtrlTasks.Add(task);
            await context.SaveChangesAsync(ct);

            // רישום היומן — אחרי ה-INSERT, כדי שיהיה לנו TaskID אמיתי
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

    /* ===================== עזר ===================== */

    /// <summary>
    /// מוודא שה-RowVersion ששלח הלקוח שווה לזה שנמצא ב-DB.
    /// placeholder: false = אין גרסה בבקשה (תאימות לאחור) — מדלגים.
    /// </summary>
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

    /// <summary>
    /// רישום ביומן על שינוי מועד סגירה — ניקוי, יצירה או דריסה.
    /// מועד זהה (עד לרמת שנייה) אינו נרשם, כדי לא להציף את היומן ברעש.
    /// </summary>
    private void TrackClosingDate(
        List<CtrlTaskHistory> history,
        long taskId,
        string fieldName,
        DateTime? before,
        DateTime? after,
        DateTime changedDate)
    {
        // אין שינוי בפועל — גם אם השניים ריקים.
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

/* ===================== חוזי ה-API ===================== */
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

    /// <summary>
    /// האם המשתמש הנוכחי הוא בין אלה שפחות צפו במשימה
    /// (נוצרה או עודכנה אחרי הצפייה האחרונה שלו) — לשימוש תג "חדש" בטבלה.
    /// </summary>
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
    /// <summary>base64 של RowVersion מהשרת — להגנת עדכון מקביל (7.4.9.4–5).</summary>
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
