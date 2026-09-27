[CmdletBinding()]
param(
    [ValidateSet('Inspect', 'Apply', 'Restore')]
    [string]$Action = 'Inspect'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$instance = 'USB\VID_84EF&PID_002A&REV_0101&MI_03\20220118'
$hardwareId = 'USB\VID_84EF&PID_002A&REV_0101&MI_03'
$backupPath = Join-Path $taskRoot 'data\gp200-driver-before.json'
$logPath = Join-Path $taskRoot 'data\gp200-driver-change.log'

Start-Transcript -Path $logPath -Append | Out-Null
try {
    $device = Get-PnpDevice -InstanceId $instance -ErrorAction Stop
    $properties = Get-PnpDeviceProperty -InstanceId $instance -KeyName `
        DEVPKEY_Device_DriverInfPath, DEVPKEY_Device_Service, DEVPKEY_Device_DriverVersion, DEVPKEY_Device_HardwareIds
    $inf = ($properties | Where-Object KeyName -eq 'DEVPKEY_Device_DriverInfPath').Data
    $ids = ($properties | Where-Object KeyName -eq 'DEVPKEY_Device_HardwareIds').Data
    if ($hardwareId -notin $ids) { throw 'The connected device does not match the inspected GP-200 MIDI interface.' }
    $device | Format-List Status, Class, FriendlyName, InstanceId
    $properties | Format-List KeyName, Data
    if ($Action -eq 'Inspect') { return }

    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Administrator rights are required to change the device driver.'
    }
    if (Get-Process GP-200 -ErrorAction SilentlyContinue) { throw 'Close the GP-200 editor completely first.' }

    if ($Action -eq 'Apply') {
        if ($inf -eq 'wdma_usb.inf') { Write-Output 'The generic USB Audio driver is already selected.'; return }
        if ($inf -ne 'usbmidi2.inf') { throw "Unexpected current driver: $inf. No change made." }
        if (-not (Test-Path -LiteralPath $backupPath)) {
            @{ instance = $instance; hardwareId = $hardwareId; inf = $inf; captured = (Get-Date).ToString('o'); properties = $properties } |
                ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $backupPath -Encoding UTF8
        }
        $targetName = 'wdma_usb.inf'
    } else {
        $saved = Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json
        if ($saved.instance -ne $instance -or $saved.inf -ne 'usbmidi2.inf') { throw 'The saved driver backup does not match this device.' }
        $targetName = 'usbmidi2.inf'
    }

    $storePattern = Join-Path $env:WINDIR "System32\DriverStore\FileRepository\${targetName}_amd64_*\$targetName"
    $packages = @(Get-ChildItem -Path $storePattern)
    if ($packages.Count -ne 1) { throw "Expected one installed package for $targetName; found $($packages.Count). No change made." }
    $targetInf = $packages[0].FullName

    # Match this pedal's MIDI interface, not its parent or Valeton ASIO audio driver.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Gp200Driver {
    [DllImport("newdev.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool UpdateDriverForPlugAndPlayDevicesW(
        IntPtr hwnd, string hardwareId, string fullInfPath, uint flags,
        [MarshalAs(UnmanagedType.Bool)] out bool rebootRequired);
}
'@
    $rebootRequired = $false
    $ok = [Gp200Driver]::UpdateDriverForPlugAndPlayDevicesW([IntPtr]::Zero, $hardwareId, $targetInf, 1, [ref]$rebootRequired)
    if (-not $ok) { throw (New-Object ComponentModel.Win32Exception([Runtime.InteropServices.Marshal]::GetLastWin32Error())) }
    Write-Output "Driver change completed. Windows restart required: $rebootRequired"
    Get-PnpDeviceProperty -InstanceId $instance -KeyName DEVPKEY_Device_DriverInfPath, DEVPKEY_Device_Service |
        Format-List KeyName, Data
} catch {
    Write-Output "FAILED: $_"
    exit 1
} finally {
    Stop-Transcript | Out-Null
}
