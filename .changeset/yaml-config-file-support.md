---
"@hawkinside_out/workflow-improvement-tracker": patch
"workflow-agent-cli": patch
---

Add support for YAML and configuration files in solution capture

- Added .yml, .yaml, .json, .md, .mdx to supported file extensions in CodeAnalyzer
- Fixed schema test expectations for isPrivate default value (false)
- Resolves issue where solution capture failed for .github/workflows directory and other config-based solutions
