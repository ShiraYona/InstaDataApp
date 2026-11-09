namespace InstaDataApp.Application.Modules.UserMetricSettings;

/// <summary>כרטיס בודד במסך ניהול התצוגה — נשלח לקליינט.</summary>
public record MetricSettingsItemDto(
    int MetricId,
    string MetricName,
    string? IconCode,
    int? DisplayOrder,
    bool IsVisible);

/// <summary>רשימת הכרטיסים של המשתמש, בסדר הסופי לתצוגה.</summary>
public record MetricSettingsDto(IReadOnlyList<MetricSettingsItemDto> Items);
