namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// התאריך שבו ייווצר הנתון — מוצג בשדה "תאריך יצירה" בדיאלוג.
/// ההיגיון יושב בשרת (ולא ב-JS של הדפדפן) כדי שתאריך היצירה יישאר
/// התאריך העסקי של המערכת בכל סביבה — גם אם שעון המחשב של המשתמש שגוי.
/// </summary>
public record GetCurrentDateQuery : IRequest<DateTime>;

public class GetCurrentDateQueryHandler : IRequestHandler<GetCurrentDateQuery, DateTime>
{
    private readonly TimeProvider _timeProvider;

    public GetCurrentDateQueryHandler(TimeProvider timeProvider) => _timeProvider = timeProvider;

    public Task<DateTime> Handle(GetCurrentDateQuery request, CancellationToken cancellationToken)
    {
        // (DateTimeKind.Unspecified), כדי שהדפדפן לא יזיז אותו ב-convert של JSON.
        var now = _timeProvider.GetLocalNow();
        return Task.FromResult(DateTime.SpecifyKind(now.Date, DateTimeKind.Unspecified));
    }
}
