$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$terminalId = 21748
$windowCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $terminalId)
$tabCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
$buttonCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $windowCondition)
foreach ($window in $windows) {
    $tabs = @($window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabCondition))
    $names = @($tabs | ForEach-Object { $_.Current.Name })
    # Only the exact two-tab leftovers observed in this session qualify.
    if ($names.Count -ne 2 -or 'Windows PowerShell' -notin $names -or 'C:\Program Files\Git\cmd\git.exe' -notin $names) { continue }
    foreach ($tab in $tabs) {
        $buttons = @($tab.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonCondition))
        $close = $buttons | Where-Object { $_.Current.Name -match '^Close tab' } | Select-Object -First 1
        if (-not $close) {
            Write-Output "No tab-close control for $($tab.Current.Name); left window untouched."
            continue
        }
        $name = $tab.Current.Name
        $pattern = $close.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $pattern.Invoke()
        Write-Output "Closed leftover tab: $name"
    }
}
