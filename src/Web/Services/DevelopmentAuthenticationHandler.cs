using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace InstaDataApp.Web.Services;

/// <summary>
/// שכבת אימות לפיתוח: מאפשרת לבקשות מ-localhost ללא הזדהות Windows
/// לעבור כמשתמש הפיתוח. מיועד לסביבת Development בלבד.
/// </summary>
public class DevelopmentAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    Microsoft.Extensions.Logging.ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "DevelopmentFallback";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var isLocal =
            Context.Connection.RemoteIpAddress is null ||
            System.Net.IPAddress.IsLoopback(Context.Connection.RemoteIpAddress);

        if (!isLocal)
        {
            // לא localhost — לא מספקים זהות; ה-Negotiate ינסה קודם.
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, CurrentUser.DevelopmentUserId),
            new Claim(ClaimTypes.Name, CurrentUser.DevelopmentUserId),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);

        return Task.FromResult(
            AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
