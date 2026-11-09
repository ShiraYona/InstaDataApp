namespace InstaDataApp.Domain.Entities;

public class UserDisplaySettings
{
    public const int DefaultCardsPerRow = 4;
    public static readonly int[] AllowedCardsPerRow = { 2, 3, 4 };

    public string UserId { get; set; } = string.Empty;
    public int CardsPerRow { get; set; } = DefaultCardsPerRow;
    public DateTime UpdatedDate { get; set; }

    public static bool IsValidCardsPerRow(int value) => AllowedCardsPerRow.Contains(value);
}
