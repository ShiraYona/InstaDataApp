using System.Security.Claims;
using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Web.Services;

/// <summary>
/// זיהוי המשתמש הנוכחי.
/// קודם לפי האימות האמיתי (Negotiate); אם אין — משתמש פיתוח קבוע.
/// </summary>
public class CurrentUser(IHttpContextAccessor httpContextAccessor) : IUser
{
    /// <summary>מזהה משתמש הפיתוח — משמש כשאין אימות אמיתי.</summary>
    public const string DevelopmentUserId = "dev-user-1";

    public string? Id
    {
        get
        {
            var authenticatedId =
                httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContextAccessor.HttpContext?.User?.Identity?.Name;

            return string.IsNullOrWhiteSpace(authenticatedId)
                ? DevelopmentUserId
                : authenticatedId;
        }
    }

    /// <summary>האם מדובר במשתמש פיתוח (לא אימות אמיתי).</summary>
    public bool IsDevelopmentUser => Id == DevelopmentUserId;
}
