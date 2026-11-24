namespace InstaDataApp.Application.Common;

/// <summary>
/// <see cref="TimeProvider"/> שאזור הזמן המקומי שלו קבוע — למשל ישראל.
/// <para>
/// ברירת המחדל (<see cref="TimeProvider.System"/>) מדווחת על אזור הזמן של המכונה,
/// שעלול להיות מוגדר לאזור אחר. תקופות החישוב הן ימים קלנדריים לפי התאריך בישראל,
/// ולכן "היום" חייב להיקבע לפי האזור הזה ולא לפי הגדרת השרת.
/// <see cref="TimeProvider.GetLocalNow"/> הוא שמבצע את ההמרה, ולכן
/// <see cref="TimeProvider.GetUtcNow"/> נשאר UTC כפי שמצופה מה-API.
/// </para>
/// </summary>
public sealed class ZonedTimeProvider : TimeProvider
{
    private readonly TimeZoneInfo _timeZone;

    public ZonedTimeProvider(TimeZoneInfo timeZone) => _timeZone = timeZone;

    public override TimeZoneInfo LocalTimeZone => _timeZone;

    /// <summary>
    /// אזור הזמן של ישראל, לפי המזהה הזמין במערכת: IANA ב-Linux/macOS
    /// ("Asia/Jerusalem") ו-Windows ("Israel Standard Time"). כשאף אחד מהם
    /// אינו מוכר — מוחזר <c>null</c>, והמתקין נופל חזרה לשעון המכונה.
    /// </summary>
    public static TimeZoneInfo? TryFindIsraelTimeZone()
    {
        foreach (var id in new[] { "Asia/Jerusalem", "Israel Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
                // ממשיכים למזהה הבא
            }
            catch (InvalidTimeZoneException)
            {
                // ממשיכים למזהה הבא
            }
        }

        return null;
    }
}
