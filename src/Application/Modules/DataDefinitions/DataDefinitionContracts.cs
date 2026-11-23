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

    /// <summary>מזהה סוג החישוב מ-CTRL_CalculationTypes — נשמר ב-CTRL_Metrics.CalculationTypeID</summary>
    public int CalculationTypeId { get; set; }

    /// <summary>חובה ל-SUM — אחרת null</summary>
    public int? SumFieldId { get; set; }

    /// <summary>null או "none" משמעו ללא קיבוץ</summary>
    public int? GroupFieldId { get; set; }

    /// <summary>
    /// תקופת החישוב: <c>DASHBOARD</c> ("לפי מסנן הלוח") או ה-Value של התקופה
    /// מ-CTRL_CalculationDays (מספר הימים, למשל "30"). ריק כשנבחר טווח תאריכים.
    /// </summary>
    public string? DateRangeType { get; set; } = MetricConstants.DateRangeDashboard;

    /// <summary>
    /// שדה התאריך שממנו מתחיל הטווח — רלוונטי רק כש-<see cref="DateRangeType"/> ריק
    /// (המשתמש בחר שני שדות תאריך של המקור במקום תקופה מוגדרת).
    /// </summary>
    public int? DateFromFieldId { get; set; }

    /// <summary>שדה התאריך שבו נגמר הטווח — יחד עם <see cref="DateFromFieldId"/></summary>
    public int? DateToFieldId { get; set; }

    public string? IconCode { get; set; }

    /// <summary>שדות הפירוט לפי סדר התצוגה</summary>
    public List<int> DetailFieldIds { get; set; } = new();

    /// <summary>האם להציג את הנתון במערכת הניהול והבקרה — נשמר ב-CTRL_Metrics.IsActive</summary>
    public bool DisplayInDashboard { get; set; } = true;

    /// <summary>
    /// עץ תנאי הסינון (JSON) — נשמר כמו שהוא ב-CTRL_Metrics.FiltersJson.
    /// null בעריכה משמעו "לא שונה" — הערך הקיים נשמר.
    /// </summary>
    public string? FiltersJson { get; set; }
}

// ----------------------------------------------------------------- מוצא

/// <summary>אפשרות ברשימה נפתחת</summary>
public class LookupOptionDto
{
    public string Value { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    /// <summary>קוד אייקון לתצוגה (PrimeIcons) — ריק כשאין אייקון</summary>
    public string? Icon { get; init; }

    /// <summary>
    /// הקוד הקנוני של סוג החישוב (COUNT / SUM / DIRECT) — לסוגי חישוב בלבד.
    /// הטופס מסתמך עליו ולא על ניסוח התווית.
    /// </summary>
    public string? Code { get; init; }

    /// <summary>
    /// לסוגי חישוב בלבד: האם הבחירה מחייבת שדה סיכום (SUM).
    /// נקבע בשרת — הלקוח לא מסיק זאת מהתווית.
    /// </summary>
    public bool RequiresSumField { get; init; }
}

/// <summary>שדה של מקור נתונים — כפי שמוצג בטופס</summary>
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
