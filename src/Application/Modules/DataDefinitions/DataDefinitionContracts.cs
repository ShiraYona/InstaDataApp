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

    /// <summary>MONTH / QUARTER / YEAR</summary>
    public string DateRangeType { get; set; } = MetricConstants.DateRangeBoardFilter;

    public string? IconCode { get; set; }

    /// <summary>שדות הפירוט לפי סדר התצוגה</summary>
    public List<int> DetailFieldIds { get; set; } = new();

    /// <summary>האם להציג את הנתון במערכת הניהול והבקרה — נשמר ב-CTRL_Metrics.IsActive</summary>
    public bool DisplayInDashboard { get; set; } = true;
}

// ----------------------------------------------------------------- מוצא

/// <summary>אפשרות ברשימה נפתחת</summary>
public class LookupOptionDto
{
    public string Value { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    /// <summary>קוד אייקון לתצוגה (PrimeIcons) — ריק כשאין אייקון</summary>
    public string? Icon { get; init; }
}

/// <summary>שדה של מקור נתונים — כפי שמוצג בטופס</summary>
public class DataSourceFieldDto
{
    public int FieldId { get; init; }

    public string Label { get; init; } = string.Empty;

    public string DataType { get; init; } = string.Empty;

    public bool IsSummable { get; init; }

    public bool IsGroupable { get; init; }
}

/// <summary>מקור נתונים יחד עם השדות שלו — התשובה ל-<c>sources/{id}</c></summary>
public class DataSourceDto
{
    public int SourceId { get; init; }

    public string Label { get; init; } = string.Empty;

    public int? DateFieldId { get; init; }

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
