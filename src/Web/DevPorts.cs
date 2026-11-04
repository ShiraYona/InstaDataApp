using System.Net;
using System.Net.Sockets;

namespace InstaDataApp.Web;

/// <summary>
/// Picks ports for a development run.
/// A hard-coded port makes the second <c>dotnet run</c> fail (the previous
/// instance still holds the address and locks the built DLLs), so the first
/// free pair at or after the defaults is used instead.
/// </summary>
public static class DevPorts
{
    public const int DefaultHttpsPort = 5001;
    public const int DefaultHttpPort = 5000;

    /// <summary>
    /// Returns the https port for this run, and the matching http port
    /// (https - 1). <see cref="PublishToEnvironment"/> keeps the SPA proxy and
    /// proxy.conf.js in sync.
    /// </summary>
    public static int ResolveHttpsPort()
    {
        for (var port = DefaultHttpsPort; port < DefaultHttpsPort + 50; port++)
        {
            if (IsFree(port) && IsFree(port - 1))
            {
                return port;
            }
        }

        throw new InvalidOperationException(
            $"No free port pair found between {DefaultHttpPort} and {DefaultHttpsPort + 49}.");
    }

    /// <summary>
    /// Publishes the chosen ports to the child processes (Angular dev server).
    /// Must run before the web host reads <c>ASPNETCORE_URLS</c>.
    /// </summary>
    public static void PublishToEnvironment(int httpsPort)
    {
        Environment.SetEnvironmentVariable(
            "ASPNETCORE_URLS",
            $"https://localhost:{httpsPort};http://localhost:{httpsPort - 1}");
    }

    /// <summary>
    /// True when nothing is bound to the port on any interface. The
    /// "listening" sockets are probed rather than "bind", because the dev
    /// server and proxy talk over https://localhost, which may resolve to ::1.
    /// </summary>
    public static bool IsFree(int port)
    {
        foreach (var address in new[] { IPAddress.Loopback, IPAddress.IPv6Loopback })
        {
            if (address == IPAddress.IPv6Loopback && !Socket.OSSupportsIPv6)
            {
                continue;
            }

            try
            {
                using var listener = new TcpListener(address, port);
                listener.Start();
                listener.Stop();
            }
            catch (SocketException)
            {
                return false;
            }
        }

        return true;
    }
}
