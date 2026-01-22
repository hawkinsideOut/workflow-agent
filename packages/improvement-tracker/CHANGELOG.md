# @hawkinside_out/workflow-improvement-tracker

## 1.3.1

### Patch Changes

- aca21b7: Add support for YAML and configuration files in solution capture
  - Added .yml, .yaml, .json, .md, .mdx to supported file extensions in CodeAnalyzer
  - Fixed schema test expectations for isPrivate default value (false)
  - Resolves issue where solution capture failed for .github/workflows directory and other config-based solutions
