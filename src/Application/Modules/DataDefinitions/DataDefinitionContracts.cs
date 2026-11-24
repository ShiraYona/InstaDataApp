namespace InstaDataApp.Application.Modules.DataDefinitions;

// -------------------------------------------------------------------- קלט

/// <summary>
/// הגוף שנשלח מהלקוח לשמירת נתון חדש.
/// זהה לשדות <c>DataDefinitionDraft</c> בצד ה-Angular.
/// כל ההפניות לשדות הן לפי <c>FieldID</c> מתוך CTRL_DataSourceFields.
/// </summary>
public class MetricDraftDto
{
    public string Name { get; set; } = string.Empty;

    public int SourceId { get; set; }

    public int CalculationTypeId { get; set; }

    public int? SumFieldId { get; set; }

    public int? GroupFieldId { get; set; }

    public string? DateRangeType { get; set; } = MetricConstants.DateRangeDashboard;

    public int? DateFromFieldId { get; set; }

    public int? DateToFieldId { get; set; }

    public string? IconCode { get; set; }

    public List<int> DetailFieldIds { get; set; } = new();

    public bool DisplayInDashboard { get; set; } = true;

    public string? FiltersJson { get; set; }
}


public class LookupOptionDto
{
    public string Value { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    public string? Icon { get; init; }
    public bool IsSum { get; init; }

    public string? Code { get; init; }

    public bool RequiresSumField { get; init; }
}

public class DataSourceFieldDto
{
    public int FieldId { get; init; }

    public string Label { get; init; } = string.Empty;

    /// <summary>שם השדה הטכני (sysname) — המפתח בתוצאות המקור</summary>
    public string FieldName { get; init; } = string.Empty;

    public string DataType { get; init; } = string.Empty;

    public bool IsSummable { get; init; }

    public bool IsGroupable { get; init; }

    public bool IsFilterable { get; init; }

    /// <summary>TEXT / NUMBER / DATE / LIST — קובע את רכיב הקלט של המסנן</summary>
    public string? FilterInputType { get; init; }

    /// <summary>CATALOG / FIXED — מהיכן מגיעים ערכי המסנן</summary>
    public string? ValueSource { get; init; }

    /// <summary>האם השדה יכול להיות ריק — IS_NULL / IS_NOT_NULL מוצעים רק לו</summary>
    public bool? IsNullable { get; init; }
}

/// <summary>מקור נתונים יחד עם השדות שלו — התשובה ל-<c>sources/{id}</c></summary>
public class DataSourceDto
{
    public int SourceId { get; init; }

    public string Label { get; init; } = string.Empty;

    /// <summary>TABLE / PROCEDURE — מוצג בתווית "סוג מקור"</summary>
    public string SourceType { get; init; } = string.Empty;

    /// <summary>ROWS / SCALAR — מקור של שורה אחת מציג חישוב ישיר, בלי קיבוץ וסינון</summary>
    public string OutputType { get; init; } = string.Empty;

    public int? DateFieldId { get; init; }

    /// <summary>
    /// לפרוצדורה — האם הוגדרו בקטלוג פרמטרי תאריך התחלה וסיום.
    /// הערכים עצמם אינם מוצגים ואינם נדרשים מהמשתמש: הטווח נגזר מתקופת החישוב.
    /// </summary>
    public bool HasDateParameters { get; init; }

    public List<DataSourceFieldDto> Fields { get; init; } = new();
}

/// <summary>שורה אחת בתצוגה מקדימה</summary>
public class PreviewRowDto
{
    public string Key { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    public long Value { get; init; }
}

/// <summary>תוצאת תצוגה מקדימה — ללא שמירה</summary>
public class PreviewResultDto
{
    public List<PreviewRowDto> Rows { get; init; } = new();

    public long Total { get; init; }
}
