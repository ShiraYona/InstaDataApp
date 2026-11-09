<#
.SYNOPSIS
    Stops a previously started local run of the app before a new build copies
    the output DLLs (Windows keeps running executables locked).

.DESCRIPTION
    Kills the app process with the given name, plus the Angular dev server
    (`ng serve`) that was started with it, so the next run gets fresh ports.

.PARAMETER Name
    Executable name without extension, e.g. InstaDataApp.Web.
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$ErrorActionPreference = 'SilentlyContinue'

$appProcs = @(Get-Process -Name $Name | Where-Object { $_.Id -ne $PID })
if ($appProcs.Count -eq 0) {
    exit 0
}

foreach ($proc in $appProcs) {
    Write-Host "Stopping previous instance of $Name (PID $($proc.Id))."
    $proc | Stop-Process -Force
}

# The SPA proxy launches the dev server from the app's ClientApp folder; stop
# it too, so the next run binds a fresh port. Only this solution's instances
# are matched (`--port` is passed by our server.js).
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'ng\.js"?\s+serve\s+--port\s+\d+' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Start-Sleep -Milliseconds 800
exit 0
