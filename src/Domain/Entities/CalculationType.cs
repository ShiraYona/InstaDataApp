namespace InstaDataApp.Domain.Entities;

/// <summary>
/// סוג חישוב — טבלת CTRL_CalculationTypes (ID / Name / Value).
/// ה-ID נשמר ב-CTRL_Metrics.CalculationTypeID;
/// ה-Name הוא הקוד (COUNT / SUM / DIRECT), וה-Value מוצג למשתמש.
/// </summary>
public class CalculationTypeDefinition
{
    public int ID { get; set; }

    /// <summary>קוד סוג החישוב — הערך שנשמר במדד (COUNT / SUM / DIRECT)</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>הטקסט המוצג בטופס</summary>
    public string Value { get; set; } = string.Empty;
}
