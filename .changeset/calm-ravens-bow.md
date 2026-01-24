---
"workflow-agent-cli": patch
"@hawkinside_out/workflow-improvement-tracker": patch
---

Fix learn command validation issues:

- Add migration, deprecation, performance, compatibility to FixCategoryEnum
- Make DependencyVersionSchema.compatibleRange optional with default "\*"
- Fix learn record categories to match FixCategoryEnum schema values
- Replace invalid "tooling" tag category with "tool" in LIBRARY_TAG_MAP
- Replace invalid "category" tag category with valid PatternTagSchema categories
- Fix inferTagsFromContent to use valid tag categories
