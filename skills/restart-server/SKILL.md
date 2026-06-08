---
name: restart-server
description: Safely stop any processes listening on port 3000 and restart the local Next.js development server using the restart script.
---

# Restarting the Development Server

Use this skill to safely stop any stale node/next processes listening on the dev port and restart the local Next.js development server using the project's official restart script.

## Workflow

1. **Locate the restart script**: The project contains a PowerShell script for restarting the development server at [restart-dev.ps1](file:///C:/Users/manpr/Documents/Codex/2026-05-08/i-want-to-build-an-ai/scripts/restart-dev.ps1).
2. **Execute the script**: Propose running the script with the `-ExecutionPolicy Bypass` flag in PowerShell.
3. **Configure Options**:
   - The script accepts a `-Port` parameter (default `3000`).
   - The script accepts a `-KeepNextCache` switch to prevent removing the `.next` directory. By default, it clears the stale Next.js cache.

## Execution Command

Run the following command from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-dev.ps1
```

If you need to keep the `.next` cache:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-dev.ps1 -KeepNextCache
```

Or to run on a different port:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-dev.ps1 -Port 3001
```
