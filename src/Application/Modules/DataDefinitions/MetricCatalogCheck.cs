using InstaDataApp.Application.Common.Exceptions;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;

using ValidationException = InstaDataApp.Application.Common.Exceptions.ValidationException;

namespace InstaDataApp.Application.Modules.DataDefinitions;


/// <summary>
/// בדיקות הקטלוג מול מסד הנתונים. כל פונקציה כאן שולפת פעם אחת ומחזירה את הערך הקנוני,
/// כך שאין צורך בקריאה נוספת בזמן השמירה.
/// </summary>
public static class MetricCatalogCheck
{
    /// <summary>
    /// המקור הפעיל שנבחר. גם ה-SourceType וה-OutputType מגיעים מאותה שורה —
    /// לפיהם נקבעים סוג החישוב החוקי והשדות הנדרשים.
    /// </summary>
    /// <exception cref="ValidationException">המקור אינו קיים או אינו פעיל</exception>
    public static async Task<CtrlDataSource> ResolveSourceAsync(
        IApplicationDbContext context,
        int sourceId,
        CancellationToken cancellationToken)
    {
        var source = await context.CtrlDataSources
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SourceID == sourceId && s.IsActive, cancellationToken);

        return source
            ?? throw Fail(nameof(MetricDraftDto.SourceId), "מקור הנתונים שנבחר אינו קיים או אינו פעיל.");
    }

    /// <summary>
    /// התאמת סוג הפלט לסוג המקור: טבלה מחזירה תמיד שורות (ROWS),
    /// ורק פרוצדורה עשויה להחזיר ערך סופי יחיד (SCALAR).
    /// </summary>
    /// <exception cref="ValidationException">הצירוף SourceType + OutputType אינו חוקי</exception>
    public static void ValidateSourceShape(CtrlDataSource source)
    {
        var sourceType = (source.SourceType ?? string.Empty).Trim();
        var outputType = (source.OutputType ?? string.Empty).Trim();

        var isTable = string.Equals(sourceType, MetricConstants.SourceTypeTable, StringComparison.OrdinalIgnoreCase);
        var isProcedure = string.Equals(sourceType, MetricConstants.SourceTypeProcedure, StringComparison.OrdinalIgnoreCase);

        if (!isTable && !isProcedure)
        {
            throw Fail(nameof(MetricDraftDto.SourceId), "סוג המקור שנבחר אינו מוכר.");
        }

        var isRows = string.Equals(outputType, MetricConstants.OutputTypeRows, StringComparison.OrdinalIgnoreCase);
        var isScalar = string.Equals(outputType, MetricConstants.OutputTypeScalar, StringComparison.OrdinalIgnoreCase);

        if (!isRows && !isScalar)
        {
            throw Fail(nameof(MetricDraftDto.SourceId), "סוג הפלט של המקור אינו מוכר.");
        }

        if (isTable && !isRows)
        {
            throw Fail(nameof(MetricDraftDto.SourceId), "טבלה מחזירה תמיד שורות (ROWS).");
        }
    }

    /// <summary>כל המזהים הם שדות פעילים של אותו מקור</summary>
    public static async Task<bool> AreFieldsOfSourceAsync(
        IApplicationDbContext context,
        int sourceId,
        IEnumerable<int> fieldIds,
        CancellationToken cancellationToken)
    {
        var distinct = fieldIds.Distinct().ToList();
        if (distinct.Count == 0)
        {
            return true;
        }

        var matches = await context.CtrlDataSourceFields.CountAsync(
            f => f.SourceID == sourceId && f.IsActive && distinct.Contains(f.FieldID), cancellationToken);

        return matches == distinct.Count;
    }

    /// <summary>
    /// סוג החישוב — הטופס שולח את ה-ID מ-CTRL_CalculationTypes, והוא נשמר ישירות
    /// ב-CTRL_Metrics.CalculationTypeID.
    /// </summary>
    /// <exception cref="ValidationException">הערך אינו מתוך הקטלוג</exception>
    public static async Task<CtrlCalculationType> ResolveCalculationTypeAsync(
        IApplicationDbContext context,
        int requestedId,
        CancellationToken cancellationToken)
    {
        var definition = await context.CtrlCalculationTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(type => type.ID == requestedId, cancellationToken);

        return definition
            ?? throw Fail(nameof(MetricDraftDto.CalculationTypeId), "סוג החישוב שנבחר אינו מוכר.");
    }

    /// <summary>
    /// תקופת החישוב — הערך שנשמר הוא ה-Value של CTRL_CalculationDays (מספר הימים כמחרוזת),
    /// כי ממנו נגזר טווח התאריכים בזמן החישוב. "לפי מסנן הלוח" נשמר כ-<c>DASHBOARD</c>,
    /// והערך ההיסטורי <c>BOARD_FILTER</c> מזוהה כמוהו בקריאה.
    /// </summary>
    /// <param name="requested">ריק = המשתמש בחר טווח תאריכים — אין תקופה, מוחזר null.</param>
    /// <remarks>
    /// ערך היסטורי שנשמר בעבר ואינו קיים ב-CTRL_CalculationDays (למשל <c>MONTH</c>)
    /// מוחזר כפי שהוא ולא נדחה — אחרת עריכת נתון ישן הייתה נכשלת בשמירה חוזרת.
    /// </remarks>
    public static async Task<string?> ResolveDateRangeAsync(
        IApplicationDbContext context,
        string? requested,
        string? requested,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requested))
        {
            return null;
        }

        var trimmed = requested.Trim();

        if (MetricConstants.IsDashboard(trimmed))
        {
            return MetricConstants.DateRangeDashboard;
        }

        var periods = await context.CalculationDays
            .AsNoTracking()
            .Select(period => new PeriodCode(period.Name, period.Value.ToString()))
            .ToListAsync(cancellationToken);

        // קודם לפי ה-Value: הערך שמגיע מהטופס הוא מספר הימים, ולא ה-Name.
        var match = periods.FirstOrDefault(period => period.Value == trimmed)
            ?? periods.FirstOrDefault(period => period.Name == trimmed);

        if (match is not null)
        {
            return match.Value;
        }

        // ערך היסטורי שנשמר בעבר (MONTH / QUARTER / YEAR וכו') — אין לו שורה בטבלה,
        // אך הוא מוכר ואין לדחות אותו, כדי שעריכת נתון ישן תישמר כמו שהוא.
        if (IsLegacyDateRange(trimmed))
        {
            return trimmed.ToUpperInvariant();
        }

        throw Fail(nameof(MetricDraftDto.DateRangeType), "תקופת החישוב שנבחרה אינה מוכרת.");
    }

    /// <summary>ערך היסטורי של תקופה — מוכר לשרת גם כשאין לו שורה ב-CTRL_CalculationDays</summary>
    public static bool IsLegacyDateRange(string? value) =>
        MetricConstants.AllowedDateRanges.Contains((value ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// סמל הכרטיס — הערך שנשמר ב-CTRL_Metrics.IconCode הוא CTRL_ICON.IconClass
    /// (אין יותר עמודת Name).
    /// </summary>
    /// <param name="requested">
    /// מחלקת האייקון. נתונים שנשמרו לפני הסרת ה-Name נושאים את ה-Name הישן —
    /// הוא מתקבל רק אם אין התאמה למחלקת אייקון, כדי שעריכת נתון ישן לא תיכשל.
    /// </param>
    /// <exception cref="ValidationException">הערך אינו מתוך הקטלוג</exception>
    public static async Task<string> ResolveIconCodeAsync(
        IApplicationDbContext context,
        string requested,
        CancellationToken cancellationToken)
    {
        var icons = await context.CardIcons
            .AsNoTracking()
            .Select(icon => icon.IconClass)
            .ToListAsync(cancellationToken);

        var match = icons.FirstOrDefault(iconClass => iconClass == requested)
            ?? icons.FirstOrDefault(iconClass => iconClass == requested.Trim());

        return match
            ?? throw Fail(nameof(MetricDraftDto.IconCode), "סמל הכרטיס שנבחר אינו מוכר.");
    }

    private static ValidationException Fail(string propertyName, string message) =>
        new([new FluentValidation.Results.ValidationFailure(propertyName, message)]);

    // רשומות פרטיות להקרנה בשאילתה — EF מתרגם אותן לעמודות רגילות
    private sealed record PeriodCode(string Name, string Value);
}

/// <summary>
/// האימות המלא של טופס הנתון (יצירה ועריכה כאחד) — שולף את הערכים הקנוניים
/// ומחזיר אותם יחד, כדי שהשמירה לא תשאל את המסד פעם נוספת.
/// </summary>
public static class MetricDraftCheck
{
    /// <exception cref="ValidationException">אחד הערכים אינו חוקי או אינו מתוך הקטלוג</exception>
    public static async Task<MetricCanonicalValues> ValidateAndCanonicalizeAsync(
        IApplicationDbContext context,
        MetricDraftDto draft,
        CancellationToken cancellationToken)
    {
        // המקור — בלעדיו אי אפשר לדעת אילו סוגי חישוב ושדות חוקיים
        var source = await MetricCatalogCheck.ResolveSourceAsync(context, draft.SourceId, cancellationToken);

        // טבלה מחזירה תמיד שורות; רק פרוצדורה עשויה להחזיר ערך סופי יחיד
        MetricCatalogCheck.ValidateSourceShape(source);

        // לכל פרוצדורה פרמטרי תאריך התחלה/סיום שהוגדרו בקטלוג מראש
        await ProcedureParameters.ValidateAsync(context, source, cancellationToken);

        // סוג החישוב — מול הקטלוג במסד; סכימה אינה מוצעת למקור ערך בודד
        var calculationType = await MetricCatalogCheck.ResolveCalculationTypeAsync(
            context, draft.CalculationTypeId, cancellationToken);

        var calculationTypeCode = CalculationTypeMap.ToCode(calculationType);

        // כללי השדות — בלי בדיקות המסד
        var shape = new MetricDraftShapeValidator(calculationTypeCode, source).Validate(draft);

        if (!shape.IsValid)
        {
            throw new ValidationException(shape.Errors);
        }

        var dateRange = await MetricCatalogCheck.ResolveDateRangeAsync(
            context, draft.DateRangeType, cancellationToken);

        var iconCode = string.IsNullOrWhiteSpace(draft.IconCode)
            ? null
            : await MetricCatalogCheck.ResolveIconCodeAsync(context, draft.IconCode, cancellationToken);

        // שדה הסיכום, הקיבוץ, הפירוט ושדות טווח התאריכים שייכים לאותו מקור
        var sourceFields = await context.CtrlDataSourceFields
            .AsNoTracking()
            .Where(f => f.SourceID == draft.SourceId && f.IsActive)
            .Select(f => new SourceField(f.FieldID, f.DataType))
            .ToListAsync(cancellationToken);

        var sourceFieldIds = sourceFields.Select(field => field.FieldId).ToHashSet();

        var failures = new List<FluentValidation.Results.ValidationFailure>();

        if (calculationTypeCode == MetricConstants.CalculationSum
            && draft.SumFieldId is { } sumFieldId
            && !sourceFieldIds.Contains(sumFieldId))
        {
            failures.Add(new(nameof(MetricDraftDto.SumFieldId), "שדה הסיכום אינו שייך למקור שנבחר."));
        }

        if (!IsOwnDateField(sourceFields, draft.DateFromFieldId))
        {
            failures.Add(new(nameof(MetricDraftDto.DateFromFieldId), "שדה תאריך ההתחלה אינו שדה תאריך של המקור שנבחר."));
        }

        if (!IsOwnDateField(sourceFields, draft.DateToFieldId))
        {
            failures.Add(new(nameof(MetricDraftDto.DateToFieldId), "שדה תאריך הסיום אינו שדה תאריך של המקור שנבחר."));
        }

        if (dateRange is null
            && (draft.DateFromFieldId is null || draft.DateToFieldId is null))
        {
            failures.Add(new(
                nameof(MetricDraftDto.DateRangeType),
                "יש לבחור תקופת חישוב, או שני שדות תאריך לטווח."));
        }

        if (IsRowsSource(source, calculationTypeCode))
        {
            if (draft.GroupFieldId is { } groupFieldId && !sourceFieldIds.Contains(groupFieldId))
            {
                failures.Add(new(nameof(MetricDraftDto.GroupFieldId), "שדה הקיבוץ אינו שייך למקור שנבחר."));
            }

            if (draft.DetailFieldIds.Any(fieldId => !sourceFieldIds.Contains(fieldId)))
            {
                failures.Add(new(nameof(MetricDraftDto.DetailFieldIds), "אחד משדות הפירוט אינו שייך למקור שנבחר."));
            }
        }

        var canonicalFilters = IsRowsSource(source, calculationTypeCode)
            ? await CanonicalizeFiltersAsync(context, draft.FiltersJson, sourceFieldIds, failures, cancellationToken)
            : null;

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return new MetricCanonicalValues(
            calculationType,
            calculationTypeCode,
            dateRange,
            draft.DateFromFieldId,
            draft.DateToFieldId,
            iconCode,
            canonicalFilters,
            source,
            sourceFields.ToDictionary(field => field.FieldId, field => field.DataType));
    }

    /// <summary>
    /// האם המקור מחזיר שורות — רק אז יש פירוט, קיבוץ וסינון.
    /// מקור ערך יחיד (SCALAR) או פרוצדורה מציג חישוב ישיר בלבד.
    /// </summary>
    public static bool IsRowsSource(CtrlDataSource source, string calculationTypeCode) =>
        string.Equals(source.OutputType, MetricConstants.OutputTypeRows, StringComparison.OrdinalIgnoreCase)
        && calculationTypeCode != MetricConstants.CalculationDirect;

    private static bool IsOwnDateField(List<SourceField> fields, int? fieldId)
    {
        if (fieldId is null)
        {
            return true;
        }

        var match = fields.FirstOrDefault(field => field.FieldId == fieldId);
        return match is not null && MetricDraftShapeValidator.IsDateType(match.DataType);
    }

    /// <summary>
    /// עץ הסינון נשמר כמחרוזת JSON כפי שהגיעה. הערכים שהטופס לא מילא עדיין (null / "")
    /// מושמטים כדי שהמסד לא ייתפס עליהם — הטופס כבר חוסם שמירה עם תנאי חלקי.
    /// מחזיר null כשאין תנאים (או כשלא נשלח עץ).
    /// </summary>
    private static async Task<string?> CanonicalizeFiltersAsync(
        IApplicationDbContext context,
        string? filtersJson,
        HashSet<int> sourceFieldIds,
        List<FluentValidation.Results.ValidationFailure> failures,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(filtersJson))
        {
            return null;
        }

        System.Text.Json.JsonDocument document;
        try
        {
            document = System.Text.Json.JsonDocument.Parse(filtersJson);
        }
        catch (System.Text.Json.JsonException)
        {
            failures.Add(new(nameof(MetricDraftDto.FiltersJson), "תנאי הסינון אינם בפורמט תקין."));
            return null;
        }

        using (document)
        {
            var foreign = MetricFilterTree.CollectFieldIds(document.RootElement)
                .Where(fieldId => !sourceFieldIds.Contains(fieldId))
                .ToList();

            if (foreign.Count > 0)
            {
                failures.Add(new(nameof(MetricDraftDto.FiltersJson), "אחד משדות הסינון אינו שייך למקור שנבחר."));
                return null;
            }

            // האופרטורים הפעילים — לפיהם נבדקים הקודים בעץ ומי מהם דורש ערך
            var operators = await context.FilterOperators
                .AsNoTracking()
                .Where(op => op.IsActive)
                .Select(op => new { op.Nome, op.NeedsValue })
                .ToListAsync(cancellationToken);

            var operatorsNeedingValue = operators
                .GroupBy(op => op.Nome.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(group => group.Key, group => group.First().NeedsValue, StringComparer.OrdinalIgnoreCase);

            MetricFilterTree.ValidateNode(document.RootElement, operatorsNeedingValue, failures);

            if (failures.Count > 0)
            {
                return null;
            }
        }

        return KeepFilledValues(filtersJson);
    }

    /// <summary>
    /// משמיט מהעץ מפתחות שערכם null או מחרוזת ריקה, בכל עומק; קבוצה שנשארה בלי ילדים
    /// אינה נשמרת, ואם השורש התרוקן — אין מה לשמור.
    /// </summary>
    private static string? KeepFilledValues(string filtersJson)
    {
        using var document = System.Text.Json.JsonDocument.Parse(filtersJson);
        var pruned = Prune(document.RootElement);
        return pruned is null ? null : System.Text.Json.JsonSerializer.Serialize(pruned);
    }

    private static object? Prune(System.Text.Json.JsonElement element)
    {
        switch (element.ValueKind)
        {
            case System.Text.Json.JsonValueKind.Object:
                var result = new Dictionary<string, object?>(StringComparer.Ordinal);
                foreach (var property in element.EnumerateObject())
                {
                    var value = Prune(property.Value);
                    if (value is not null)
                    {
                        result[property.Name] = value;
                    }
                }
                return result.Count == 0 ? null : result;

            case System.Text.Json.JsonValueKind.Array:
                var items = element.EnumerateArray()
                    .Select(Prune)
                    .Where(item => item is not null)
                    .ToList();
                return items.Count == 0 ? null : items;

            case System.Text.Json.JsonValueKind.Null:
            case System.Text.Json.JsonValueKind.Undefined:
                return null;

            case System.Text.Json.JsonValueKind.String:
                return string.IsNullOrWhiteSpace(element.GetString()) ? null : element.GetString();

            case System.Text.Json.JsonValueKind.Number:
                return element.GetRawText();

            case System.Text.Json.JsonValueKind.True:
                return true;

            case System.Text.Json.JsonValueKind.False:
                return false;

            default:
                return null;
        }
    }
}

/// <summary>שדה פעיל של המקור — המזהה וסוג הנתון</summary>
public sealed record SourceField(int FieldId, string DataType);

/// <summary>הערכים הקנוניים של המפתחות הזרים/המחרוזתיים של המדד</summary>
public sealed record MetricCanonicalValues(
    CtrlCalculationType CalculationType,
    string CalculationTypeCode,
    // DASHBOARD / מספר הימים כמחרוזת ("30") — null כשנבחר טווח תאריכים
    string? DateRangeType,
    int? DateFromFieldId,
    int? DateToFieldId,
    string? IconCode,
    // הערך המנוקה של CTRL_Metrics.FiltersJson — null כשאין תנאי סינון
    string? FiltersJson,
    CtrlDataSource Source,
    IReadOnlyDictionary<int, string> FieldDataTypes)
{
    /// <summary>הערך שנשמר ב-CTRL_Metrics.CalculationTypeID</summary>
    public int CalculationTypeId => CalculationType.ID;

    /// <summary>ROWS — מקור שמחזיר שורות; אחרת ערך סופי יחיד</summary>
    public bool IsRows => MetricDraftCheck.IsRowsSource(Source, CalculationTypeCode);
}

/// <summary>כללי הטופס שעובדים בלי מסד הנתונים</summary>
public class MetricDraftShapeValidator : AbstractValidator<MetricDraftDto>
{
    /// <param name="calculationType">
    /// הקוד הקנוני (COUNT / SUM / DIRECT), או null כשעדיין לא ידוע.
    /// לפיו נקבעים החובה לשדה סיכום והצורך בשדות פירוט.
    /// </param>
    /// <param name="source">
    /// שורת המקור (TABLE / PROCEDURE, ROWS / SCALAR), או null כשאינה ידועה —
    /// למשל בכלי בדיקה שעובדים על הטופס בלבד.
    /// </param>
    public MetricDraftShapeValidator(string? calculationType = null, CtrlDataSource? source = null)
    {
        var isSum = string.Equals(
            calculationType,
            MetricConstants.CalculationSum,
            StringComparison.OrdinalIgnoreCase);

        var isDirect = string.Equals(
            calculationType,
            MetricConstants.CalculationDirect,
            StringComparison.OrdinalIgnoreCase);

        // מקור ערך סופי יחיד — טבלה או פרוצדורה כאחד. ההכרעה לפי OutputType בלבד:
        // פרוצדורה שמחזירה שורות (ROWS) מתנהגת כמו טבלת ROWS — סיכום, קיבוץ, סינון ופירוט.
        var isScalarOnly = source is not null
            && string.Equals(source.OutputType, MetricConstants.OutputTypeScalar, StringComparison.OrdinalIgnoreCase);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("יש להזין שם לנתון.")
            .MaximumLength(MetricConstants.MetricNameMaxLength);

        RuleFor(x => x.SourceId)
            .GreaterThan(0).WithMessage("יש לבחור מקור נתונים.");

        RuleFor(x => x.CalculationTypeId)
            .GreaterThan(0)
            .WithMessage("יש לבחור סוג חישוב.");

        RuleFor(x => x.CalculationTypeId)
            .Must(_ => !isScalarOnly || isDirect)
            .WithMessage("מקור שאינו מחזיר שורות מחייב חישוב ישיר (DIRECT).");

        RuleFor(x => x.CalculationTypeId)
            .Must(_ => isScalarOnly || !isDirect)
            .WithMessage("חישוב ישיר (DIRECT) מיועד למקור שמחזיר ערך סופי בלבד.");

        // תקופה או טווח תאריכים — אחד מהם חייב להיות מלא
        RuleFor(x => x.DateRangeType)
            .Must(value => string.IsNullOrWhiteSpace(value)
                || MetricConstants.IsDashboard(value)
                || MetricConstants.AllowedDateRanges.Contains(value.Trim())
                // ה-Value של כל תקופה ב-CTRL_CalculationDays (לא רק 7 / 30 / 90)
                || MetricConstants.IsPeriodDaysValue(value))
            .WithMessage("תקופת החישוב שנבחרה אינה חוקית.");

        // ערך שהוזן ידנית (לא מתוך הקטלוג) נדחה כאן; שם התקופה נבדק מול CTRL_CalculationDays
        RuleFor(x => x.DateRangeType)
            .Must(value => string.IsNullOrWhiteSpace(value)
                || value.Trim().Length <= MetricConstants.DateRangeNameMaxLength)
            .WithMessage("תקופת החישוב שנבחרה אינה חוקית.");

        RuleFor(x => x.DateFromFieldId)
            .Null()
            .When(x => MetricConstants.TryGetPeriodDays(x.DateRangeType, out _))
            .WithMessage("טווח תאריכים אינו נבחר יחד עם תקופת חישוב.");

        RuleFor(x => x.DateToFieldId)
            .Null()
            .When(x => MetricConstants.TryGetPeriodDays(x.DateRangeType, out _))
            .WithMessage("טווח תאריכים אינו נבחר יחד עם תקופת חישוב.");

        RuleFor(x => x.DateToFieldId)
            .Must((draft, toFieldId) => toFieldId is null
                || draft.DateFromFieldId is null
                || toFieldId != draft.DateFromFieldId)
            .WithMessage("שדה תאריך ההתחלה ושדה תאריך הסיום חייבים להיות שונים.");

        RuleFor(x => x.DateFromFieldId)
            .NotNull()
            .When(x => x.DateToFieldId is not null)
            .WithMessage("בטווח תאריכים יש לבחור שדה תאריך התחלה.");

        RuleFor(x => x.DateToFieldId)
            .NotNull()
            .When(x => x.DateFromFieldId is not null)
            .WithMessage("בטווח תאריכים יש לבחור שדה תאריך סיום.");

        RuleFor(x => x.IconCode).MaximumLength(MetricConstants.IconCodeMaxLength);

        // שדות החישוב והפירוט אינם נוגעים למקור ערך יחיד
        RuleFor(x => x.SumFieldId)
            .Null()
            .When(_ => isScalarOnly)
            .WithMessage("מקור שאינו מחזיר שורות אינו כולל שדה סיכום.");

        RuleFor(x => x.GroupFieldId)
            .Null()
            .When(_ => isScalarOnly)
            .WithMessage("מקור שאינו מחזיר שורות אינו כולל קיבוץ.");

        RuleFor(x => x.DetailFieldIds)
            .Empty()
            .When(_ => isScalarOnly)
            .WithMessage("מקור שאינו מחזיר שורות אינו כולל שדות פירוט.");

        RuleFor(x => x.SumFieldId)
            .NotNull()
            .When(_ => isSum && !isScalarOnly)
            .WithMessage("בחישוב סכום יש לבחור שדה לסיכום.");

        RuleFor(x => x.SumFieldId)
            .Null()
            .When(_ => !isSum)
            .WithMessage("שדה הסיכום רלוונטי לחישוב סכום בלבד.");

        RuleFor(x => x.GroupFieldId)
            .Null()
            .When(_ => isDirect && !isScalarOnly)
            .WithMessage("בחישוב ישיר אין קיבוץ.");

        RuleFor(x => x.DetailFieldIds)
            .NotEmpty()
            .When(_ => !isScalarOnly)
            .WithMessage("יש לבחור לפחות שדה אחד להצגה בפירוט.");
    }

    /// <summary>
    /// האם סוג הנתון של השדה הוא תאריך — שדה כזה יכול לשמש בשני צדי הטווח.
    /// </summary>
    public static bool IsDateType(string? dataType)
    {
        var normalized = (dataType ?? string.Empty).Trim();
        return normalized.Contains("date", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("time", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("תאריך", StringComparison.Ordinal);
    }
}
