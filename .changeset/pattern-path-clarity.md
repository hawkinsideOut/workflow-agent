---
"workflow-agent-cli": patch
---

Improve pattern save operation clarity by displaying file paths

- Added explicit file path output when saving blueprints via learn:record and learn:capture commands
- Added file path output when saving fix patterns via verify command
- Makes it clear that patterns are saved to their respective directories (fixes/, blueprints/, solutions/)
