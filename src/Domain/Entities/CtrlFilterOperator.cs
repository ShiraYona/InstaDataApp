namespace InstaDataApp.Domain.Entities;

/// <summary>
/// אופרטור לתנאי סינון — טבלת CTRL_FilterOperators הקיימת.
/// <para>
/// <c>Nome</c> — הקוד הקנוני (EQ / NE / GT / CONTAINS / IN / IS_NULL …) שנשמר בעץ
/// תנאי הסינון; <c>Name</c> — התווית המוצגת בטופס.
/// </para>
/// </summary>
public class CtrlFilterOperator
{
    public int ID { get; set; }

    /// <summary>הקוד הקנוני של האופרטור — הערך שנשמר ב-FiltersJson</summary>
    public string Nome { get; set; } = string.Empty;

    /// <summary>התווית שבעברית שמוצגת ליד התנאי בטופס</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>false = אין להזין ערך (IS_NULL / IS_NOT_NULL)</summary>
    public bool NeedsValue { get; set; }

    /// <summary>true = בורר ערכים מרובה (IN / NOT_IN)</summary>
    public bool IsMultiValue { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>סדר התצוגה ברשימה הנפתחת</summary>
    public int SortOrder { get; set; }
}
