$paths = @(
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$apps = Get-ItemProperty $paths -ErrorAction SilentlyContinue | 
  Where-Object { -not [string]::IsNullOrWhiteSpace($_.DisplayName) } | 
  Select-Object DisplayName, DisplayVersion, Publisher, EstimatedSize, InstallLocation, DisplayIcon, UninstallString

$apps | ConvertTo-Json -Compress -Depth 2
