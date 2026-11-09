using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// אימות ההגדרה מול הקטלוג: שהמקור והשדות קיימים ושייכים לאותו מקור,
/// ושהיחס ביניהם הגיוני (SUM דורש שדה סכום, וכו').
/// </summary>
public class MetricDraftValidator : AbstractValidator<MetricDraftDto>
{
    private readonly IApplicationDbContext _context;

    private readonly HashSet<int> _sumTypeIds;

    public MetricDraftValidator(IApplicationDbContext context)
    {
        _context = context;

        // סוג החישוב "סכימה" — מזוהה לפי שורת הקטלוג שכולה SUM
        _sumTypeIds = context.CalculationTypes
            .Where(type => type.Name == MetricConstants.CalculationSum || type.Value.Contains("סכימ"))
            .Select(type => type.ID)
            .ToHashSet();

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("יש להזין שם לנתון.")
            .MaximumLength(80);

        RuleFor(x => x.SourceId)
            .GreaterThan(0)
            .MustAsync((id, ct) => _context.DataSources.AnyAsync(s => s.SourceID == id && s.IsActive, ct))
            .WithMessage("מקור הנתונים שנבחר אינו קיים.");

        RuleFor(x => x.CalculationTypeId)
            .GreaterThan(0)
            .MustAsync((id, ct) => _context.CalculationTypes.AnyAsync(t => t.ID == id, ct))
            .WithMessage("סוג חישוב לא חוקי.");

        RuleFor(x => x.DateRangeType)
            .Must(MetricConstants.AllowedDateRanges.Contains)
            .WithMessage("תקופת חישוב לא חוקית.");

        RuleFor(x => x.IconCode).MaximumLength(50);

        RuleFor(x => x.SumFieldId)
            .NotNull()
            .When(x => IsSumType(x.CalculationTypeId))
            .WithMessage("בחישוב סכום יש לבחור שדה לסיכום.");

        RuleFor(x => x.SumFieldId)
            .Null()
            .When(x => !IsSumType(x.CalculationTypeId))
            .WithMessage("שדה הסיכום רלוונטי לחישוב סכום בלבד.");

        RuleFor(x => x.SumFieldId!.Value)
            .MustAsync((dto, fieldId, ct) => IsFieldOfSourceAsync(dto.SourceId, fieldId, ct))
            .When(x => x.SumFieldId.HasValue)
            .WithMessage("שדה הסיכום אינו שייך למקור שנבחר.");

        RuleFor(x => x.GroupFieldId!.Value)
            .MustAsync((dto, fieldId, ct) => IsFieldOfSourceAsync(dto.SourceId, fieldId, ct))
            .When(x => x.GroupFieldId.HasValue)
            .WithMessage("שדה הקיבוץ אינו שייך למקור שנבחר.");

        RuleFor(x => x.DetailFieldIds)
            .NotEmpty()
            .WithMessage("יש לבחור לפחות שדה אחד להצגה בפירוט.");

        RuleFor(x => x.DetailFieldIds)
            .MustAsync((dto, ids, ct) => AreFieldsOfSourceAsync(dto.SourceId, ids, ct))
            .WithMessage("אחד משדות הפירוט אינו שייך למקור שנבחר.");
    }

    /// <summary>
    /// האם סוג החישוב שנבחר הוא סכימה. אימות מלא של השדות נעשה ב-<c>MetricDraftCheck</c>;
    /// כאן נדרש רק סימון לענף-התנאי של שדה הסיכום.
    /// </summary>
    private bool IsSumType(int calculationTypeId) => _sumTypeIds.Contains(calculationTypeId);

    private Task<bool> IsFieldOfSourceAsync(int sourceId, int fieldId, CancellationToken ct) =>
        _context.DataSourceFields.AnyAsync(
            f => f.FieldID == fieldId && f.SourceID == sourceId && f.IsActive, ct);

    /// <summary>
    /// כל שדות הפירוט שייכים למקור שנבחר. רשימה ריקה נפסלת ב-<see cref="NotEmptyAttribute"/>,
    /// ולכן כאן לא נדרש מקרה מיוחד עבורה.
    /// </summary>
    private async Task<bool> AreFieldsOfSourceAsync(int sourceId, List<int> ids, CancellationToken ct)
    {
        if (ids.Count == 0)
        {
            // אין שדות — את השגיאה מדווח הכלל של NotEmpty
            return true;
        }

        var distinct = ids.Distinct().ToList();

        var matches = await _context.DataSourceFields.CountAsync(
            f => f.SourceID == sourceId && f.IsActive && distinct.Contains(f.FieldID), ct);

        return matches == distinct.Count;
    }
}
