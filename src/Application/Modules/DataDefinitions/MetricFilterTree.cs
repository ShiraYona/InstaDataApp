using System.Text.Json;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// בדיקות עץ תנאי הסינון שנשלח מהטופס. העץ נשמר כמו שהוא ב-CTRL_Metrics.FiltersJson,
/// ולכן הבדיקה מוודאת רק את מה שהשרת תלוי בו: JSON תקין, וכל שדה מסונן שייך למקור.
/// </summary>
public static class MetricFilterTree
{
    private const string FieldIdProperty = "fieldId";

    /// <summary>
    /// אוסף את כל ה-<c>fieldId</c> שמופיעים בעץ, בכל עומק ובכל מבנה.
    /// ערך שאינו מספר שלם מתעלמים ממנו כאן — ה-JSON נשמר כמחרוזת, ולא אמור להיכשל בגללו.
    /// </summary>
    public static HashSet<int> CollectFieldIds(JsonElement node)
    {
        var ids = new HashSet<int>();
        Collect(node, ids, depth: 0);
        return ids;
    }

    /// <summary>הקוד הקנוני של תנאי "ריק" / "אינו ריק" — אין ערך לתנאים האלה</summary>
    public static readonly string[] NoValueOperators = ["IS_NULL", "IS_NOT_NULL"];

    /// <summary>אופרטורים של ערכים מרובים — חייבים לפחות ערך אחד</summary>
    public static readonly string[] MultiValueOperators = ["IN", "NOT_IN"];

    /// <summary>קוד האופרטור שבערכת התנאי (CTRL_FilterOperators.Nome)</summary>
    private const string OperatorProperty = "operator";

    /// <summary>ילדים של קבוצה — התנאים והקבוצות שמתחתיה</summary>
    private const string ChildrenProperty = "children";

    /// <summary>
    /// מוסיף ל-<paramref name="failures"/> את ליקויי המבנה של העץ:
    /// קבוצה ריקה, תנאי בלי אופרטור מוכר, תנאי שדורש ערך ואין לו,
    /// ו-IN / NOT_IN בלי ערך אחד לפחות.
    /// </summary>
    public static void ValidateNode(
        JsonElement node,
        IReadOnlyDictionary<string, bool> operatorsNeedingValue,
        List<FluentValidation.Results.ValidationFailure> failures,
        int depth = 0)
    {
        // העץ בטופס מוגבל ל-3 רמות — עומק גדול מדי מעיד על קלט לא תקין
        if (depth > MaxDepth)
        {
            failures.Add(new(nameof(MetricDraftDto.FiltersJson), "עץ תנאי הסינון עמוק מדי."));
            return;
        }

        if (node.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        var children = ReadChildren(node);

        // תנאי — אובייקט עם operator
        if (TryGetString(node, OperatorProperty, out var operatorCode))
        {
            ValidateCondition(node, operatorCode, operatorsNeedingValue, failures);
            return;
        }

        // קבוצה — ילדים שהם תנאים וקבוצות
        if (children is null)
        {
            return;
        }

        if (children.Value.GetArrayLength() == 0)
        {
            failures.Add(new(nameof(MetricDraftDto.FiltersJson), "אין לשמור קבוצת סינון בלי תנאים."));
            return;
        }

        foreach (var child in children.Value.EnumerateArray())
        {
            ValidateNode(child, operatorsNeedingValue, failures, depth + 1);
        }
    }

    /// <summary>העומק המרבי של קבוצות — שורש (1), תת-קבוצה (2), תת-קבוצה (3)</summary>
    public const int MaxDepth = 3;

    private static void ValidateCondition(
        JsonElement condition,
        string operatorCode,
        IReadOnlyDictionary<string, bool> operatorsNeedingValue,
        List<FluentValidation.Results.ValidationFailure> failures)
    {
        var code = operatorCode.Trim();

        if (!operatorsNeedingValue.TryGetValue(code, out var needsValue))
        {
            failures.Add(new(nameof(MetricDraftDto.FiltersJson), "אחד האופרטורים בתנאי הסינון אינו מוכר."));
            return;
        }

        // אין ערך לתנאי הזה (IS_NULL / IS_NOT_NULL) — אין מה לבדוק
        if (!needsValue)
        {
            return;
        }

        var requiresMulti = MultiValueOperators.Contains(code, StringComparer.OrdinalIgnoreCase);

        if (requiresMulti)
        {
            var valueCount = condition.TryGetProperty("values", out var values)
                && values.ValueKind == JsonValueKind.Array
                    ? values.EnumerateArray().Count(IsFilled)
                    : 0;

            if (valueCount == 0)
            {
                failures.Add(new(nameof(MetricDraftDto.FiltersJson), "תנאי \"בתוך רשימה\" חייב לפחות ערך אחד."));
            }
            return;
        }

        var hasValue =
            (condition.TryGetProperty("value", out var value) && IsFilled(value))
            || (condition.TryGetProperty("values", out var single) && single.ValueKind == JsonValueKind.Array
                && single.EnumerateArray().Any(IsFilled));

        if (!hasValue)
        {
            failures.Add(new(nameof(MetricDraftDto.FiltersJson), "יש למלא ערך לכל תנאי סינון."));
        }
    }

    private static bool IsFilled(JsonElement value) =>
        value.ValueKind switch
        {
            JsonValueKind.String => !string.IsNullOrWhiteSpace(value.GetString()),
            JsonValueKind.Number => true,
            JsonValueKind.True or JsonValueKind.False => true,
            _ => false
        };

    private static JsonElement? ReadChildren(JsonElement group) =>
        group.TryGetProperty(ChildrenProperty, out var children)
        && children.ValueKind == JsonValueKind.Array
            ? children
            : null;

    private static bool TryGetString(JsonElement node, string property, out string value)
    {
        value = string.Empty;
        if (!node.TryGetProperty(property, out var element) || element.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = element.GetString() ?? string.Empty;
        return value.Trim().Length > 0;
    }

    private static void Collect(JsonElement node, HashSet<int> ids, int depth)
    {
        // הגנה מפני קלט ענק או מעגלי-למראה: העץ בטופס מוגבל ל-3 רמות
        if (depth > 16)
        {
            return;
        }

        if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
            {
                Collect(item, ids, depth + 1);
            }
            return;
        }

        if (node.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        foreach (var property in node.EnumerateObject())
        {
            if (string.Equals(property.Name, FieldIdProperty, StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Number
                && property.Value.TryGetInt32(out var fieldId))
            {
                ids.Add(fieldId);
                continue;
            }

            Collect(property.Value, ids, depth + 1);
        }
    }
}
