$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "ClipMaster AI.lnk"
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $desktop "ClipMaster AI.bat"
$shortcut.WorkingDirectory = $desktop
$shortcut.Description = "ClipMaster AI - Offline Video Repurposing Studio"
if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $shortcut.IconLocation = "C:\Program Files\Google\Chrome\Application\chrome.exe,0"
}
$shortcut.Save()
Write-Host "Created shortcut: $(Test-Path $shortcutPath)"
