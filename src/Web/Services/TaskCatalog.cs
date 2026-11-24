namespace InstaDataApp.Web.Services;

/// <summary>
/// קטלוג הצוותים והעובדים של מסך המשימות — מקור זמני עד שתהיה טבלת עובדים אמיתית.
///
/// TODO(7.1.1): להחליף בטבלאות DB (CTRL_Teams / CTRL_People) כשהן ייווצרו.
/// כל שאר המערכת קוראת דרך המחלקה הזו בלבד, ולכן החלפת המקור תיגע בקובץ אחד.
/// </summary>
public static class TaskCatalog
{
    /// <summary>(TeamID, פעיל)</summary>
    public readonly record struct Person(int TeamId, bool IsActive);

    /// <summary>העובדים הזמינים לשיוך — מפתח: מזהה משתמש.</summary>
    public static readonly IReadOnlyDictionary<string, Person> People =
        new Dictionary<string, Person>(StringComparer.OrdinalIgnoreCase)
        {
            ["user-1"] = new(1, true),
            ["user-2"] = new(1, true),
            ["user-3"] = new(1, true),
            ["user-4"] = new(2, false)   // עובד לא פעיל — לבדיקה
        };

    /// <summary>הצוותים הפעילים שניתן לשייך אליהם משימה.</summary>
    public static readonly IReadOnlyList<int> ActiveTeamIds = new[] { 1, 2, 3 };

    /// <summary>שם תצוגה לצוות.</summary>
    public static string TeamLabel(int teamId) => $"צוות {teamId}";

    /// <summary>האם העובד שנבחר פעיל ומשויך לצוות שנבחר. עובד ריק תמיד תקין.</summary>
    public static bool IsValidAssignee(string? userId, int teamId) =>
        string.IsNullOrWhiteSpace(userId)
        || (People.TryGetValue(userId, out var p) && p.TeamId == teamId && p.IsActive);

    /// <summary>האם הצוות פעיל.</summary>
    public static bool IsActiveTeam(int teamId) => ActiveTeamIds.Contains(teamId);
}
