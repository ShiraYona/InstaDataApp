namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מספר ימים לחישוב — טבלת CTRL_CalculationDays (Id / Name / Value).
/// ה-Name הוא הטקסט המוצג למשתמש ("30 ימים"), וה-Value הוא מספר הימים עצמו.
/// "לפי מסנן הלוח" אינו שורה בטבלה — הוא מתווסף לרשימה בקוד.
/// </summary>
public class CalculationPeriod
{
    public int Id { get; set; }

    /// <summary>הטקסט המוצג בטופס (כמו "30 ימים")</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>מספר הימים עצמו (7 / 30 / 90)</summary>
    public int Value { get; set; }
}
