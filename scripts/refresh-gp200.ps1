$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Start-Transcript -Path (Join-Path $taskRoot 'data\gp200-driver-refresh.log') -Append | Out-Null
try {
    if (Get-Process GP-200 -ErrorAction SilentlyContinue) { throw 'Close the GP-200 editor first.' }
    # The old MIDI endpoint can survive the driver swap in the service cache.
    Restart-Service -Name midisrv
    & pnputil.exe /restart-device 'USB\VID_84EF&PID_002A\20220118'
    if ($LASTEXITCODE -eq 3010) {
        Write-Output 'Windows requires a PC restart to complete the device configuration. No automatic restart was requested.'
    } elseif ($LASTEXITCODE -ne 0) { throw "Device restart returned $LASTEXITCODE" }
} catch {
    Write-Output "FAILED: $_"
    exit 1
} finally {
    Stop-Transcript | Out-Null
}
