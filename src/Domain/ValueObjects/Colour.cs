namespace InstaDataApp.Domain.ValueObjects;

public class Colour(string code) : ValueObject
{
    public static Colour From(string code)
    {
        var colour = new Colour(code);

        if (!SupportedColours.Contains(colour))
        {
            throw new UnsupportedColourException(code);
        }

        return colour;
    }

    public static Colour White => new("#FFFFFF");

    public static Colour Black => new("#000000");

    public string Code { get; private set; } = string.IsNullOrWhiteSpace(code) ? "#000000" : code;

    public static implicit operator string(Colour colour) => colour.ToString();

    public static explicit operator Colour(string code) => From(code);

    public override string ToString() => Code;

    protected static IEnumerable<Colour> SupportedColours
    {
        get
        {
            yield return White;
            yield return Black;
        }
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Code;
    }
}
