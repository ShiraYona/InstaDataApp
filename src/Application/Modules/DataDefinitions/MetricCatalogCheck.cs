using InstaDataApp.Application.Common.Exceptions;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;

using ValidationException = InstaDataApp.Application.Common.Exceptions.ValidationException;

namespace InstaDataApp.Application.Modules.DataDefinitions;


public static class MetricCatalogCheck
{
    /// <exception cref="ValidationException">המקור אינו קיים או אינו פעיל</exception>
    public static async Task EnsureSourceAsync(
        IApplicationDbContext context,
        int sourceId,
        CancellationToken cancellationToken)
    {
        var exists = await context.DataSources
            .AnyAsync(s => s.SourceID == sourceId && s.IsActive, cancellationToken);

        if (!exists)
        {
            throw Fail(string.Empty, "מקור הנתונים שנבחר אינו קיים או אינו פעיל.");
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

        var matches = await context.DataSourceFields.CountAsync(
            f => f.SourceID == sourceId && f.IsActive && distinct.Contains(f.FieldID), cancellationToken);

        return matches == distinct.Count;
    }

    /// <summary>
    /// סוג החישוב — הטופס שולח את ה-ID מ-CTRL_CalculationTypes (ראה
    /// GetCalculationTypesQueryHandler), והוא נשמר ישירות ב-CTRL_Metrics.CalculationTypeID.
    /// מחזיר גם את השורה עצמה כדי שנדע אם מדובר בסכימה.
    /// </summary>
    /// <exception cref="ValidationException">הערך אינו מתוך הקטלוג</exception>
    public static async Task<CalculationTypeDefinition> ResolveCalculationTypeAsync(
        IApplicationDbContext context,
        int requestedId,
        CancellationToken cancellationToken)
    {
        var definition = await context.CalculationTypes
            .FirstOrDefaultAsync(type => type.ID == requestedId, cancellationToken);

        return definition
            ?? throw Fail(nameof(MetricDraftDto.CalculationTypeId), "סוג החישוב שנבחר אינו מוכר.");
    }

    /// <summary>
    /// תקופת החישוב — הערך שנשמר הוא הטקסט שמוצג למשתמש (CTRL_CalculationDays.Name),
    /// וערך מספרי מתאים ל-Value (מספר הימים).
    /// </summary>
    /// <exception cref="ValidationException">הערך אינו מתוך הקטלוג</exception>
    public static async Task<string> ResolveDateRangeAsync(
        IApplicationDbContext context,
        string requested,
        CancellationToken cancellationToken)
    {
        if (requested == MetricConstants.DateRangeBoardFilter)
        {
            return MetricConstants.DateRangeBoardFilter;
        }

        var periods = await context.CalculationPeriods
            .Select(period => new PeriodCode(period.Name, period.Value.ToString()))
            .ToListAsync(cancellationToken);

        var match = periods.FirstOrDefault(period => period.Name == requested)
            ?? periods.FirstOrDefault(period => period.Value == requested.Trim());

        return match?.Name
            ?? throw Fail(nameof(MetricDraftDto.DateRangeType), "תקופת החישוב שנבחרה אינה מוכרת.");
    }

    /// <summary>
    /// סמל הכרטיס — הערך שנשמר ב-CTRL_Metrics.IconCode הוא CTRL_ICON.Name.
    /// </summary>
    /// <exception cref="ValidationException">הערך אינו מתוך הקטלוג</exception>
    public static async Task<string> ResolveIconCodeAsync(
        IApplicationDbContext context,
        string requested,
        CancellationToken cancellationToken)
    {
        var icons = await context.CardIcons
            .Select(icon => new IconCode(icon.Name, icon.IconClass))
            .ToListAsync(cancellationToken);

        var match = icons.FirstOrDefault(icon => icon.Name == requested)
            ?? icons.FirstOrDefault(icon => icon.IconClass == requested);

        return match?.Name
            ?? throw Fail(nameof(MetricDraftDto.IconCode), "סמל הכרטיס שנבחר אינו מוכר.");
    }

    private static ValidationException Fail(string propertyName, string message) =>
        new([new FluentValidation.Results.ValidationFailure(propertyName, message)]);

    // רשומות פרטיות להקרנה בשאילתה — EF מתרגם אותן לעמודות רגילות
    private sealed record PeriodCode(string Name, string Value);

    private sealed record IconCode(string Name, string IconClass);
}

/// <summary>
/// האימות המלא של טופס "יצירת נתון חדש" (FluentValidation)
/// </summary>
public static class MetricDraftCheck
{
    public static async Task ValidateAsync(
        IApplicationDbContext context,
        MetricDraftDto draft,
        CancellationToken cancellationToken)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();

        // סוג החישוב — מול הקטלוג במסד; בלעדיו אין טעם לבדוק את שאר השדות
        var calculationType = await MetricCatalogCheck.ResolveCalculationTypeAsync(
            context, draft.CalculationTypeId, cancellationToken);

        // כללי השדות — בלי בדיקות המסד
        var shape = new MetricDraftShapeValidator(CalculationTypeMap.ToCode(calculationType.Name))
            .Validate(draft);

        if (!shape.IsValid)
        {
            failures.AddRange(shape.Errors);
            throw new ValidationException(failures);
        }

        await MetricCatalogCheck.EnsureSourceAsync(context, draft.SourceId, cancellationToken);

        // שדה הסיכום והקיבוץ יכולים להיות אותו שדה — שולפים את שדות המקור פעם אחת
        var sourceFields = await context.DataSourceFields
            .Where(f => f.SourceID == draft.SourceId && f.IsActive)
            .Select(f => f.FieldID)
            .ToListAsync(cancellationToken);

        var sourceFieldIds = sourceFields.ToHashSet();

        if (draft.SumFieldId is { } sumFieldId && !sourceFieldIds.Contains(sumFieldId))
        {
            failures.Add(new(nameof(MetricDraftDto.SumFieldId), "שדה הסיכום אינו שייך למקור שנבחר."));
        }

        if (draft.GroupFieldId is { } groupFieldId && !sourceFieldIds.Contains(groupFieldId))
        {
            failures.Add(new(nameof(MetricDraftDto.GroupFieldId), "שדה הקיבוץ אינו שייך למקור שנבחר."));
        }

        if (draft.DetailFieldIds.Exists(fieldId => !sourceFieldIds.Contains(fieldId)))
        {
            failures.Add(new(nameof(MetricDraftDto.DetailFieldIds), "אחד משדות הפירוט אינו שייך למקור שנבחר."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }
    }

    /// <summary>
    /// מחזיר את הערכים הקנוניים לשמירה: סוג החישוב (השורה עצמה), תקופת החישוב וסמל הכרטיס
    /// </summary>
    /// <exception cref="ValidationException">אחד הערכים אינו מתוך הקטלוג</exception>
    public static async Task<MetricCanonicalValues> CanonicalizeAsync(
        IApplicationDbContext context,
        MetricDraftDto draft,
        CancellationToken cancellationToken)
    {
        var calculationType = await MetricCatalogCheck.ResolveCalculationTypeAsync(
            context, draft.CalculationTypeId, cancellationToken);

        var dateRange = await MetricCatalogCheck.ResolveDateRangeAsync(
            context, draft.DateRangeType, cancellationToken);

        var iconCode = string.IsNullOrWhiteSpace(draft.IconCode)
            ? null
            : await MetricCatalogCheck.ResolveIconCodeAsync(context, draft.IconCode, cancellationToken);

        return new MetricCanonicalValues(calculationType, dateRange, iconCode);
    }
}

/// <summary>הערכים הקנוניים של המפתחות הזרים/המחרוזתיים של המדד</summary>
public sealed record MetricCanonicalValues(
    CalculationTypeDefinition CalculationType,
    string DateRangeType,
    string? IconCode)
{
    /// <summary>הקוד הקנוני (COUNT / SUM / DIRECT)</summary>
    public string CalculationTypeCode => CalculationTypeMap.ToCode(CalculationType.Name);

    /// <summary>הערך שנשמר ב-CTRL_Metrics.CalculationTypeID</summary>
    public int CalculationTypeId => CalculationType.ID;
}

/// <summary>כללי הטופס שעובדים בלי מסד הנתונים</summary>
public class MetricDraftShapeValidator : AbstractValidator<MetricDraftDto>
{
    /// <param name="calculationType">
    /// הקוד הקנוני (COUNT / SUM / DIRECT), או null כשעדיין לא ידוע.
    /// לפיו נקבעת חובת שדה הסיכום.
    /// </param>
    public MetricDraftShapeValidator(string? calculationType = null)
    {
        var isSum = string.Equals(
            calculationType,
            MetricConstants.CalculationSum,
            StringComparison.OrdinalIgnoreCase);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("יש להזין שם לנתון.")
            .MaximumLength(MetricConstants.MetricNameMaxLength);

        RuleFor(x => x.SourceId)
            .GreaterThan(0).WithMessage("יש לבחור מקור נתונים.");

        RuleFor(x => x.CalculationTypeId)
            .GreaterThan(0)
            .WithMessage("יש לבחור סוג חישוב.");

        RuleFor(x => x.DateRangeType)
            .Must(MetricConstants.AllowedDateRanges.Contains)
            .WithMessage("תקופת החישוב שנבחרה אינה חוקית.");

        RuleFor(x => x.IconCode).MaximumLength(MetricConstants.IconCodeMaxLength);

        RuleFor(x => x.SumFieldId)
            .NotNull()
            .When(_ => isSum)
            .WithMessage("בחישוב סכום יש לבחור שדה לסיכום.");

        RuleFor(x => x.SumFieldId)
            .Null()
            .When(_ => !isSum)
            .WithMessage("שדה הסיכום רלוונטי לחישוב סכום בלבד.");

        RuleFor(x => x.DetailFieldIds)
            .NotEmpty()
            .WithMessage("יש לבחור לפחות שדה אחד להצגה בפירוט.");
    }
}
