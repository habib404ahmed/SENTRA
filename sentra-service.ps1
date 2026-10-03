<#
.SYNOPSIS
    SENTRA Backend — Optional Local Development Manager (NOT for production use)
.DESCRIPTION
    ╔══════════════════════════════════════════════════════════════════╗
    ║  CLOUD-ONLY DEPLOYMENT — PRODUCTION RUNS ON RENDER              ║
    ║                                                                  ║
    ║  The SENTRA application is deployed and runs entirely in the     ║
    ║  cloud using Render.com services:                                ║
    ║    • Frontend  → Render Static Site (sentra-frontend-5u9x)       ║
    ║    • Backend   → Render Web Service  (sentra-backend-zy7w)       ║
    ║    • Database  → Render PostgreSQL   (sentra-db)                 ║
    ║                                                                  ║
    ║  This script is for OPTIONAL LOCAL DEVELOPMENT only.             ║
    ║  It does NOT run automatically. The Windows Startup shortcut      ║
    ║  has been removed. No scheduled tasks are registered.            ║
    ║                                                                  ║
    ║  To work with the production system, use:                        ║
    ║    https://sentra-frontend-5u9x.onrender.com                     ║
    ╚══════════════════════════════════════════════════════════════════╝

    LOCAL DEV USAGE (manual, optional):
    - Requires: local PostgreSQL + Python venv in backend/.venv
    - Backend will NOT start automatically on login or system boot
    - Use only for development and testing against a local database

    Actions:
      start     - Start the SENTRA backend in the background (dev only)
      stop      - Stop the running local SENTRA backend
      restart   - Restart the local backend
      status    - Check local health, process status, database connectivity
      logs      - View recent local backend logs
      install   - [DISABLED] Do NOT use — auto-startup has been removed
      uninstall - Remove any existing startup shortcuts or tasks
.PARAMETER Action
    start | stop | restart | status | logs | uninstall
.PARAMETER Follow
    Stream logs continuously when viewing logs (equivalent to tail -f)
.EXAMPLE
    .\sentra-service.ps1 status
    .\sentra-service.ps1 start
    .\sentra-service.ps1 logs -Follow
    .\sentra-service.ps1 uninstall
#>

[CmdletBinding()]
param(
    [ValidateSet("install", "uninstall", "start", "stop", "restart", "status", "logs", "install-task")]
    [string]$Action = "status",
    [switch]$Follow
)

$ErrorActionPreference = "Continue"

# Resolve absolute paths dynamically from this script's directory
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$LogsDir = Join-Path $BackendDir "logs"
$LogFile = Join-Path $LogsDir "backend.log"
$PidFile = Join-Path $LogsDir "backend.pid"
$StopSignalFile = Join-Path $LogsDir "stop.signal"
$SupervisorScript = Join-Path $BackendDir "scripts\server_supervisor.py"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvPythonw = Join-Path $BackendDir ".venv\Scripts\pythonw.exe"
$StartupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$StartupShortcut = Join-Path $StartupFolder "SENTRA_Backend.lnk"
$TaskName = "SENTRA_Backend_Service"

# Ensure Python executable exists
if (Test-Path $VenvPythonw) {
    $PythonExe = $VenvPythonw
} elseif (Test-Path $VenvPython) {
    $PythonExe = $VenvPython
} else {
    $PythonExe = "python.exe"
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  SENTRA Backend Manager: $Title" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
}

function Get-BackendPort {
    $port = 8000
    $envFile = Join-Path $BackendDir ".env"
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -ErrorAction SilentlyContinue
        foreach ($line in $content) {
            if ($line -match "^\s*PORT\s*=\s*(\d+)") {
                $port = [int]$matches[1]
                break
            }
        }
    }
    return $port
}

function Test-BackendHealth {
    param([int]$Port = 8000)
    $result = @{
        Online = $false
        StatusCode = 0
        LatencyMs = 0
        DatabaseStatus = "unknown"
        Engine = "unknown"
        ErrorMessage = ""
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        $sw.Stop()
        $result.Online = $true
        $result.StatusCode = 200
        $result.LatencyMs = [int]$sw.ElapsedMilliseconds
    } catch {
        $sw.Stop()
        $result.ErrorMessage = $_.Exception.Message
        return $result
    }

    # Also test Database connectivity
    try {
        $dbRes = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health/db" -Method Get -TimeoutSec 3 -ErrorAction Stop
        $result.DatabaseStatus = $dbRes.database
        $result.Engine = $dbRes.engine
    } catch {
        $result.DatabaseStatus = "disconnected"
    }

    return $result
}

function Get-PortProcess {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $procId = $connections[0].OwningProcess
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        return @{
            Pid = $procId
            Name = if ($proc) { $proc.ProcessName } else { "Unknown" }
        }
    }
    return $null
}

# ----------------- ACTION HANDLERS -----------------

function Start-BackendService {
    Write-Header "Starting Background Service"
    $port = Get-BackendPort

    # Check if already running
    $existing = Get-PortProcess -Port $port
    $health = Test-BackendHealth -Port $port
    if ($health.Online) {
        Write-Host "SENTRA backend is ALREADY RUNNING and healthy on http://localhost:$port" -ForegroundColor Green
        if ($existing) {
            Write-Host "Process: $($existing.Name) (PID: $($existing.Pid))" -ForegroundColor Gray
        }
        return
    }

    if (-not (Test-Path $LogsDir)) {
        New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
    }

    # Remove any stale stop signal
    if (Test-Path $StopSignalFile) {
        Remove-Item $StopSignalFile -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Launching background supervisor..." -ForegroundColor Yellow
    Write-Host "Runtime:   $PythonExe" -ForegroundColor Gray
    Write-Host "Script:    $SupervisorScript" -ForegroundColor Gray
    Write-Host "Logs:      $LogFile" -ForegroundColor Gray

    # Launch supervisor completely windowless and detached from current console session
    $cmd = "`"$PythonExe`" `"$SupervisorScript`""
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $cmd
        CurrentDirectory = $BackendDir
    }

    Write-Host "Supervisor launched with PID: $($res.ProcessId)" -ForegroundColor Cyan
    Write-Host "Waiting for backend health check..." -NoNewline

    $started = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
        $h = Test-BackendHealth -Port $port
        if ($h.Online) {
            $started = $true
            break
        }
    }
    Write-Host ""

    if ($started) {
        Write-Host "SUCCESS: SENTRA backend is active and responding on http://localhost:$port" -ForegroundColor Green
        Write-Host "Health Response Latency: $($h.LatencyMs)ms" -ForegroundColor Gray
        Write-Host "PostgreSQL Connectivity: $($h.DatabaseStatus) ($($h.Engine))" -ForegroundColor $(if ($h.DatabaseStatus -eq "connected") { "Green" } else { "Yellow" })
    } else {
        Write-Host "WARNING: Backend process launched but health check timed out." -ForegroundColor Yellow
        Write-Host "Inspect logs for startup diagnostics: .\sentra-service.ps1 logs" -ForegroundColor White
    }
}

function Stop-BackendService {
    Write-Header "Stopping Backend Service"
    $port = Get-BackendPort

    if (-not (Test-Path $LogsDir)) {
        New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
    }

    # Signal supervisor to stop gracefully
    Set-Content -Path $StopSignalFile -Value "STOP" -Force

    Write-Host "Signaled supervisor to shut down cleanly..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2

    # Terminate process on port if still active
    $portProc = Get-PortProcess -Port $port
    if ($portProc) {
        Write-Host "Terminating process on port $port (PID $($portProc.Pid))..." -ForegroundColor Yellow
        Stop-Process -Id $portProc.Pid -Force -ErrorAction SilentlyContinue
    }

    # Clean up PID file
    if (Test-Path $PidFile) {
        $pidContent = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($pidContent -match "(\d+):(\d+)") {
            $supPid = [int]$matches[1]
            $childPid = [int]$matches[2]
            Stop-Process -Id $supPid -Force -ErrorAction SilentlyContinue
            Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 1
    if (Test-Path $StopSignalFile) {
        Remove-Item $StopSignalFile -Force -ErrorAction SilentlyContinue
    }

    $finalCheck = Test-BackendHealth -Port $port
    if (-not $finalCheck.Online) {
        Write-Host "SUCCESS: SENTRA backend has stopped." -ForegroundColor Green
    } else {
        Write-Host "WARNING: Backend is still responding on port $port." -ForegroundColor Red
    }
}

function Restart-BackendService {
    Stop-BackendService
    Start-Sleep -Seconds 2
    Start-BackendService
}

function Show-BackendStatus {
    Write-Header "System Status"
    $port = Get-BackendPort
    $health = Test-BackendHealth -Port $port
    $portProc = Get-PortProcess -Port $port

    # 1. API Status
    Write-Host "FastAPI Backend:       " -NoNewline
    if ($health.Online) {
        Write-Host "ONLINE (HTTP 200, $($health.LatencyMs)ms)" -ForegroundColor Green
    } else {
        Write-Host "OFFLINE (Port $port unreachable)" -ForegroundColor Red
    }

    # 2. Port & Process
    Write-Host "Listening Port:        " -NoNewline
    Write-Host "http://localhost:$port" -ForegroundColor Cyan
    Write-Host "Active Process:        " -NoNewline
    if ($portProc) {
        Write-Host "$($portProc.Name) (PID: $($portProc.Pid))" -ForegroundColor Green
    } else {
        Write-Host "None" -ForegroundColor Gray
    }

    # 3. PostgreSQL Database
    Write-Host "PostgreSQL Database:   " -NoNewline
    if ($health.DatabaseStatus -eq "connected") {
        Write-Host "CONNECTED ($($health.Engine))" -ForegroundColor Green
    } elseif ($health.Online) {
        Write-Host "DISCONNECTED (Database unreachable via API)" -ForegroundColor Yellow
    } else {
        Write-Host "UNKNOWN (Backend is offline)" -ForegroundColor Gray
    }

    # 4. Windows PostgreSQL Service
    Write-Host "PostgreSQL Service:    " -NoNewline
    $pgService = Get-Service *postgres* -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        $color = if ($pgService.Status -eq "Running") { "Green" } else { "Yellow" }
        Write-Host "$($pgService.Name) is $($pgService.Status) (Startup: $($pgService.StartType))" -ForegroundColor $color
    } else {
        Write-Host "No Windows PostgreSQL service detected" -ForegroundColor Gray
    }

    # 5. Task Scheduler Automatic Startup
    Write-Host "Scheduled Task:        " -NoNewline
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "$TaskName is Registered ($($task.State))" -ForegroundColor Green
    } else {
        Write-Host "Not registered (Use: .\sentra-service.ps1 install)" -ForegroundColor Gray
    }

    # 6. User Startup Shortcut
    Write-Host "Startup Shortcut:      " -NoNewline
    if (Test-Path $StartupShortcut) {
        Write-Host "INSTALLED ($StartupShortcut)" -ForegroundColor Green
    } else {
        Write-Host "Not installed" -ForegroundColor Gray
    }

    # 7. Recent Log Preview
    if (Test-Path $LogFile) {
        Write-Host ""
        Write-Host "Recent Log Entries (last 5 lines):" -ForegroundColor White
        Get-Content $LogFile -Tail 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor DarkGray
        }
    }
}

function Show-BackendLogs {
    Write-Header "Backend Service Logs"
    if (-not (Test-Path $LogFile)) {
        Write-Host "No log file found at: $LogFile" -ForegroundColor Yellow
        return
    }

    if ($Follow) {
        Write-Host "Streaming logs (Press Ctrl+C to stop)..." -ForegroundColor Cyan
        Get-Content -Path $LogFile -Tail 30 -Wait
    } else {
        Write-Host "Recent 40 log lines from $($LogFile):" -ForegroundColor Cyan
        Write-Host ""
        Get-Content -Path $LogFile -Tail 40
        Write-Host ""
        Write-Host "Tip: Run '.\sentra-service.ps1 logs -Follow' to stream in real-time." -ForegroundColor Gray
    }
}

function Install-AutoStartupTask {
    param([switch]$ElevatedMode)

    Write-Header "Install Automatic Startup"

    $isAdmin = Test-IsAdmin

    # 1. Register User Startup Shortcut (Works for all users without admin elevation)
    Write-Host "Configuring User Logon Startup shortcut..." -ForegroundColor Yellow
    try {
        $wsh = New-Object -ComObject WScript.Shell
        $shortcut = $wsh.CreateShortcut($StartupShortcut)
        $shortcut.TargetPath = $PythonExe
        $shortcut.Arguments = "`"$SupervisorScript`""
        $shortcut.WorkingDirectory = $BackendDir
        $shortcut.Description = "SENTRA AI Backend Service Startup"
        $shortcut.WindowStyle = 7 # Minimized/Hidden
        $shortcut.Save()
        Write-Host "SUCCESS: Created user startup shortcut in:" -ForegroundColor Green
        Write-Host "  $StartupShortcut" -ForegroundColor Gray
    } catch {
        Write-Host "Failed to create startup shortcut: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 2. Configure Windows Task Scheduler (Requires Administrator elevation)
    if ($isAdmin) {
        Write-Host ""
        Write-Host "Configuring Windows Task Scheduler with crash recovery..." -ForegroundColor Yellow
        try {
            $action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$SupervisorScript`"" -WorkingDirectory $BackendDir
            $trigger = New-ScheduledTaskTrigger -AtLogOn
            $settings = New-ScheduledTaskSettingsSet `
                -AllowStartIfOnBatteries `
                -DontStopIfGoingOnBatteries `
                -ExecutionTimeLimit (New-TimeSpan -Days 0) `
                -RestartCount 5 `
                -RestartInterval (New-TimeSpan -Minutes 1)

            Register-ScheduledTask `
                -TaskName $TaskName `
                -Action $action `
                -Trigger $trigger `
                -Settings $settings `
                -Description "SENTRA AI Threat Detection Platform - Background Backend Service with Auto-Recovery" `
                -Force | Out-Null

            Write-Host "SUCCESS: Registered scheduled task '$TaskName' in Windows Task Scheduler." -ForegroundColor Green
            Write-Host "Triggers: At user logon (Runs in background, auto-restarts on unexpected crash)" -ForegroundColor Gray
        } catch {
            Write-Host "Task Scheduler registration failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "[NOTICE] Windows Task Scheduler registration requires Administrator privileges." -ForegroundColor Yellow
        Write-Host "The user Startup shortcut has already been installed and will start the backend at logon." -ForegroundColor White
        Write-Host ""
        Write-Host "To also register with Windows Task Scheduler (for native OS-level service recovery):" -ForegroundColor Cyan
        Write-Host "  1. Right-click PowerShell -> 'Run as Administrator'" -ForegroundColor White
        Write-Host "  2. Run: cd `"$ProjectRoot`"; .\sentra-service.ps1 install" -ForegroundColor White
    }

    # 3. Check PostgreSQL Windows Service
    Write-Host ""
    Write-Host "Checking PostgreSQL Windows Service Configuration..." -ForegroundColor Yellow
    $pgService = Get-Service *postgres* -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        Write-Host "Found service: $($pgService.DisplayName) ($($pgService.Name))" -ForegroundColor Gray
        Write-Host "Status:        $($pgService.Status)" -ForegroundColor Gray
        Write-Host "Startup Type:  $($pgService.StartType)" -ForegroundColor Gray
        if ($pgService.StartType -ne "Automatic") {
            Write-Host "TIP: To set PostgreSQL to start automatically with Windows, run in Admin PowerShell:" -ForegroundColor Yellow
            Write-Host "     Set-Service -Name `"$($pgService.Name)`" -StartupType Automatic" -ForegroundColor White
        } else {
            Write-Host "PostgreSQL is already configured for Automatic startup." -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "Automatic startup configuration complete!" -ForegroundColor Green
    Write-Host "Start the backend now with: .\sentra-service.ps1 start" -ForegroundColor White
}

function Uninstall-AutoStartupTask {
    Write-Header "Uninstall Automatic Startup"

    # 1. Remove User Startup Shortcut
    if (Test-Path $StartupShortcut) {
        Remove-Item $StartupShortcut -Force -ErrorAction SilentlyContinue
        Write-Host "Removed user startup shortcut: $StartupShortcut" -ForegroundColor Green
    } else {
        Write-Host "No user startup shortcut found." -ForegroundColor Gray
    }

    # 2. Remove Task Scheduler Task
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($task) {
        if (Test-IsAdmin) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Host "SUCCESS: Unregistered Task Scheduler task '$TaskName'." -ForegroundColor Green
        } else {
            Write-Host "[NOTICE] Removing the Scheduled Task requires Administrator elevation." -ForegroundColor Yellow
            Write-Host "Run in Administrator PowerShell: Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false" -ForegroundColor White
        }
    } else {
        Write-Host "No Scheduled Task named '$TaskName' found." -ForegroundColor Gray
    }

    Write-Host "Uninstallation complete." -ForegroundColor Green
}

# ----------------- MAIN DISPATCHER -----------------
switch ($Action.ToLower()) {
    "start"       { Start-BackendService }
    "stop"        { Stop-BackendService }
    "restart"     { Restart-BackendService }
    "status"      { Show-BackendStatus }
    "logs"        { Show-BackendLogs }
    "install"     {
        Write-Host ""
        Write-Host "=================================================================" -ForegroundColor Red
        Write-Host "  AUTO-STARTUP DISABLED — SENTRA RUNS IN THE CLOUD             " -ForegroundColor Red
        Write-Host "=================================================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Production runs on Render.com — no local process needed." -ForegroundColor Yellow
        Write-Host "  Frontend:  https://sentra-frontend-5u9x.onrender.com" -ForegroundColor Cyan
        Write-Host "  Backend:   https://sentra-backend-zy7w.onrender.com" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  The 'install' action has been disabled to prevent registering" -ForegroundColor White
        Write-Host "  a startup shortcut or scheduled task on this machine." -ForegroundColor White
        Write-Host ""
        Write-Host "  For LOCAL DEVELOPMENT only, use: .\sentra-service.ps1 start" -ForegroundColor White
        Write-Host "  To clean up any existing startup entries: .\sentra-service.ps1 uninstall" -ForegroundColor White
        Write-Host ""
    }
    "install-task" {
        Write-Host "Auto-startup is disabled. See 'install' for details." -ForegroundColor Yellow
    }
    "uninstall"   { Uninstall-AutoStartupTask }
    default       { Show-BackendStatus }
}
