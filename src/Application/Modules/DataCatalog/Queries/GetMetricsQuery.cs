using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Queries;

public record GetMetricsQuery : IRequest<List<Metric>>;

public class GetMetricsQueryHandler : IRequestHandler<GetMetricsQuery, List<Metric>>
{
    private readonly IApplicationDbContext _context;

    public GetMetricsQueryHandler(IApplicationDbContext context) => _context = context;

    /// <summary>
    /// שליפת כל הנתונים. שם סוג החישוב נטען מ-CTRL_CalculationTypes
    /// באמצעות LEFT JOIN — נתון עם CalculationTypeID שאינו קיים עדיין
    /// לא ייעלם מהרשימה, רק יגיע עם שם ריק.
    /// </summary>
    public Task<List<Metric>> Handle(GetMetricsQuery request, CancellationToken cancellationToken) =>
        (from m in _context.Metrics.AsNoTracking()
         join t in _context.CalculationTypes.AsNoTracking()
             on m.CalculationTypeId equals t.Id into calcTypes
         from t in calcTypes.DefaultIfEmpty()
         select new Metric
         {
             MetricId = m.MetricId,
             MetricName = m.MetricName,
             SourceId = m.SourceId,
             CalculationTypeId = m.CalculationTypeId,
             CalculationTypeName = t == null ? null : t.Name,
             SumFieldId = m.SumFieldId,
             GroupFieldId = m.GroupFieldId,
             DateRangeType = m.DateRangeType,
             IconCode = m.IconCode,
             IsActive = m.IsActive,
             CreatedBy = m.CreatedBy,
             CreatedDate = m.CreatedDate,
             UpdatedBy = m.UpdatedBy,
             UpdatedDate = m.UpdatedDate,
             RowVersion = m.RowVersion,
         })
        .ToListAsync(cancellationToken);
}
