# PokéBonk × REA — passive investigation (Windows)

**Status:** bootstrap and analysis plan prepared; not executed on the user's PC.

Target: https://pokebonk.com/ · Tool: https://github.com/PCSKTestBox/rea

## Safety and scope

- Read-only observation of normal manual gameplay and public client assets only. No cheats, game modification, automated gameplay, login bypass, load testing, or manipulation of server traffic. PokéBonk prohibits these actions in https://pokebonk.com/legal .
- Use a separate Chrome profile **without login**. The Chrome DevTools Protocol (CDP) endpoint must stay on `127.0.0.1`; never expose or forward port 9222.
- Save evidence and downloaded JavaScript **outside this public repository** under `%USERPROFILE%\PCSKTestBox\pokebonk-rea\captures`. Do not publish game code/assets, account data, access tokens, or detailed session logs.
- Distinguish observed behavior, source-backed interpretation, and unknown server-side behavior.

## 1. Prepare Windows

Install Chrome and supported Node.js: 22.19+ on 22.x, 24.11+ on 24.x, or 26+. Recommended Node.js 24.11+ LTS.

Open PowerShell (new session) and run:

```powershell
node --version
npm --version
npm view rea-agents version
npm install --global rea-agents
rea --version
```

Run `Start-PokeBonkREA.ps1` from this directory:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-PokeBonkREA.ps1
```

This opens PokéBonk in a **dedicated Chrome profile** using a loopback CDP endpoint and lists browser targets. Copy the target ID for `https://pokebonk.com/`. The separate browser and REA must be on the same PC.

## 2. Passive capture

```powershell
powershell -ExecutionPolicy Bypass -File .\Capture-PokeBonkREA.ps1 -TargetId 'REPLACE_WITH_TARGET_ID'
```

The script saves: page evidence (including exported script sources), bundle analysis, script export, and static JavaScript analysis. If a call fails, inspect the error and retry individual commands:

```powershell
rea list-browser-targets http://127.0.0.1:9222 --json
rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --observation-ms 1000 --json
rea analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json
```

Capture begun after loading cannot see earlier traffic. For state changes, run:

```powershell
rea observe-web-session http://127.0.0.1:9222 TARGET_ID --observation-ms 10000 --json
```

Then **manually** reload or navigate in the dedicated Chrome within the 10-second window. Do not automate actual gameplay. Use screenshots only when necessary.

## 3. Evidence-driven milestones

| Phase | Subject | Deliverable |
| --- | --- | --- |
| 0 | Versions, connectivity, privacy & rules | Reproducible environment checklist |
| 1 | DOM, scripts, workers, resource graph, rendering | Browser/asset architecture diagram |
| 2 | JS bundle, import graph, routes, sourcemaps | Module map with source references |
| 3 | Manual menu/play/combat/level-up/game over observation | Timestamped state-transition table |
| 4 | Hypotheses about AI, collisions, damage, growth, camera | Evidence-ranked mechanic report |
| 5 | Resource licenses, request metadata, storage key names | Data-flow and provenance diagram |
| 6 | Cross-check static + observed facts | Report with evidence IDs and known unknowns |

Do not claim a specific frontend engine, game formula, or server implementation without observed evidence. Keep sensitive results local and only share redacted summaries.

## Fork versus published npm runtime

The commands use the official `rea-agents` npm distribution to start quickly. **The repo fork is not automatically the executable used by these commands.** To test this fork's own code, separately clone it and follow its `package.json` scripts (`npm ci` and documented build), then compare pinned versions. Setting up REA for an AI agent is optional; if wanted later, run `npx rea-agents setup`, inspect changes, and approve the specific integration. Hopper/Ghidra are unnecessary for JavaScript and website observations.

References: [REA browser observation](../../docs/browser-observation.md) · [export scripts](../../docs/website-script-export.md) · [installation](../../docs/installation.md) · [PokéBonk rules](https://pokebonk.com/legal).
