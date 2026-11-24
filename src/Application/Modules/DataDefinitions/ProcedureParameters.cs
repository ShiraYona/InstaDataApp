using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;

using ValidationException = InstaDataApp.Application.Common.Exceptions.ValidationException;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// פרמטרי ההרצה של מקור נתונים (CTRL_DataSourceParameters).
/// <para>
/// כל פרוצדורה מקבלת תאריך התחלה ותאריך סיום, והצוות מוסיף אותם לקטלוג מראש.
/// המשתמש בטופס אינו מזין אותם — הטווח נגזר מתקופת החישוב בזמן החישוב
/// (<see cref="DateRangeResolver"/>). כאן נבדק רק שההגדרה עצמה קיימת ותקינה.
/// </para>
/// </summary>
public static class ProcedureParameters
{
    /// <summary>סוגי נתון תאריך מקובלים בעמודת ParameterType</summary>
    private static readonly string[] DateParameterTypes = ["DATE", "DATETIME", "DATETIME2", "SMALLDATETIME"];

    // שמות נפוצים לפרמטרים, כשאין קידומת DATE_FROM / DATE_TO — השוואה ללא תלות ברישיות
    private static readonly string[] StartNames = ["DATEFROM", "FROMDATE", "STARTDATE", "DATE_START", "FROM"];
    private static readonly string[] EndNames = ["DATETO", "TODATE", "ENDDATE", "DATE_END", "TO"];

    /// <summary>
    /// האם הפרוצדורה מוגדרת עם פרמטרי תאריך התחלה וסיום תקפים.
    /// </summary>
    /// <returns>
    /// עבור מקור TABLE — תמיד <c>true</c> (אין פרמטרים להרצה).
    /// עבור פרוצדורה — <c>true</c> רק אם נמצאו שני פרמטרי תאריך, אחד מכל צד.
    /// </returns>
    public static bool HasDateRangeParameters(IEnumerable<CtrlDataSourceParameter> parameters)
    {
        var found = parameters
            .Where(parameter => IsDateType(parameter.ParameterType))
            .Select(parameter => Classify(parameter.ParameterName))
            .ToList();

        return found.Contains(ProcedureDateSide.Start) && found.Contains(ProcedureDateSide.End);
    }

    /// <summary>
    /// בודק את הגדרת הפרמטרים של המקור לפני השמירה. מקור טבלה — אין בדיקה.
    /// </summary>
    /// <exception cref="ValidationException">לפרוצדורה חסרים פרמטרי תאריך התחלה/סיום</exception>
    public static async Task ValidateAsync(
        IApplicationDbContext context,
        CtrlDataSource source,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(source.SourceType, MetricConstants.SourceTypeProcedure, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var parameters = await context.CtrlDataSourceParameters
            .AsNoTracking()
            .Where(parameter => parameter.SourceID == source.SourceID)
            .Select(parameter => new CtrlDataSourceParameter
            {
                ParameterName = parameter.ParameterName,
                ParameterType = parameter.ParameterType
            })
            .ToListAsync(cancellationToken);

        if (HasDateRangeParameters(parameters))
        {
            return;
        }

        throw new ValidationException(
        [
            new FluentValidation.Results.ValidationFailure(
                nameof(MetricDraftDto.SourceId),
                "לפרוצדורה חסרים פרמטרי תאריך התחלה וסיום. יש להשלים אותם בקטלוג המקורות לפני יצירת הנתון.")
        ]);
    }

    /// <summary>
    /// האם סוג הנתון של הפרמטר הוא תאריך — כמו <see cref="MetricDraftShapeValidator.IsDateType"/>,
    /// אך גם לפי שמות טיפוסי SQL.
    /// </summary>
    private static bool IsDateType(string? parameterType)
    {
        var normalized = (parameterType ?? string.Empty).Trim();
        return DateParameterTypes.Contains(normalized, StringComparer.OrdinalIgnoreCase)
            || MetricDraftShapeValidator.IsDateType(normalized);
    }

    private static ProcedureDateSide Classify(string? parameterName)
    {
        // מסירים את @ וכל מה שלפניו, וכן קו תחתון — "@Date_From" הופך ל-"DATEFROM"
        var name = (parameterName ?? string.Empty).Trim().TrimStart('@', ' ')
            .Replace("_", string.Empty, StringComparison.Ordinal)
            .ToUpperInvariant();

        if (name.StartsWith("DATEFROM", StringComparison.Ordinal) || StartNames.Contains(name))
        {
            return ProcedureDateSide.Start;
        }

        if (name.StartsWith("DATETO", StringComparison.Ordinal) || EndNames.Contains(name))
        {
            return ProcedureDateSide.End;
        }

        return ProcedureDateSide.None;
    }

    private enum ProcedureDateSide
    {
        None,
        Start,
        End
    }
}
