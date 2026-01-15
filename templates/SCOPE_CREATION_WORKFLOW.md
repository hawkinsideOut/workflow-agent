# Scope Creation Workflow for AI Agents

This document provides a structured workflow for AI agents creating custom scope packages. **ALWAYS ASK before assuming** any details about the project.

## Critical Rule: Zero-Assumption Principle

**Never assume or infer details about:**
- Project domain or industry
- Feature areas or scope names
- Naming conventions
- Technical stack or architecture
- Publishing intentions

**Always prompt the user explicitly for this information.**

---

## Required Prompts (Ask in Order)

### 1. Project Domain Clarification

**Prompt:**
> "What is the primary domain or industry for this project? For example: fintech, healthcare, gaming, education, e-commerce, etc."

**Purpose:** Understand the context to suggest relevant scope categories.

**Expected Response:** Single domain/industry name or brief description.

---

### 2. Feature Area Enumeration

**Prompt:**
> "What are the main feature areas or functional components of your project? Please list them (aim for 8-15 areas). For example, for a SaaS app: authentication, user profiles, billing, notifications, analytics."

**Purpose:** Identify specific scopes that map to actual functionality.

**Expected Response:** List of feature areas (comma-separated or numbered).

**Follow-up:** If fewer than 8 or more than 20 features listed:
> "You listed [N] features. The recommended range is 8-15 scopes. Would you like to add more detail, consolidate some areas, or proceed as is?"

---

### 3. Naming Convention Preferences

**Prompt:**
> "What naming style do you prefer for your scopes? Examples:
> - Single words (auth, billing, users)
> - Kebab-case (user-management, api-endpoints)
> - Descriptive phrases (subscription-billing, email-notifications)
> 
> Note: All scope names must be lowercase alphanumeric with hyphens only."

**Purpose:** Ensure consistent naming that matches team conventions.

**Expected Response:** Preference indication or examples.

---

### 4. Scope-to-Structure Mapping

**Prompt:**
> "Do your scopes map to:
> 1. **Folders/modules** in your codebase (e.g., src/auth, src/billing)
> 2. **Feature areas** regardless of folder structure
> 3. **Both** - they align with both features and folders
> 
> This helps determine how granular the scopes should be."

**Purpose:** Align scopes with actual codebase organization.

**Expected Response:** Choice of 1, 2, or 3.

---

### 5. Migration vs. New Creation

**Prompt:**
> "Are you:
> 1. **Migrating** existing scopes from workflow.config.json to a package
> 2. **Creating** a new custom scope package from scratch
> 
> If migrating, I can use your existing scope definitions. If creating new, we'll define them together."

**Purpose:** Determine whether to use existing data or start fresh.

**Expected Response:** "migrate" or "create new"

**Follow-up if "migrate":**
> "I found [N] scopes in your workflow.config.json:
> [List scopes]
> 
> Should I use these as-is, or would you like to review/modify them first?"

---

### 6. Package Publishing Intent

**Prompt:**
> "Do you plan to:
> 1. **Publish** this scope package to npm for reuse across projects
> 2. **Keep it local** to this workspace only
> 3. **Undecided** - create it now, decide later
> 
> This affects whether we include publishing configuration."

**Purpose:** Include appropriate publishing metadata and instructions.

**Expected Response:** Choice of 1, 2, or 3.

---

## Validation Checklist (Review Before Creating)

Before generating the package, confirm:

- [ ] All scope names are lowercase alphanumeric with hyphens
- [ ] All scope names are 32 characters or less
- [ ] No scope names match reserved words (by default: init, create, build, test, config, docs, ci, deps)
- [ ] All scope descriptions are at least 10 characters
- [ ] No duplicate scope names
- [ ] Scope count is between 8-15 (or user explicitly accepted otherwise)
- [ ] Package name is valid and doesn't conflict with existing packages

### Reserved Scope Names

By default, the following scope names are **reserved** and cannot be used:

- `init` - Reserved for initialization commands
- `create` - Reserved for creation commands
- `build` - Reserved for build commands
- `test` - Reserved for testing commands
- `config` - Reserved for configuration commands
- `docs` - Reserved for documentation commands
- `ci` - Reserved for CI/CD commands
- `deps` - Reserved for dependency commands

**Suggested Alternatives:**

| Reserved Name | Suggested Alternative |
|---------------|----------------------|
| docs | documentation |
| test | testing |
| config | configuration |
| build | builds |
| ci | cicd |
| deps | dependencies |

**Customizing Reserved Names:**

Users can customize the reserved scope names list in their `workflow.config.json`:

```json
{
  "projectName": "my-project",
  "scopes": [...],
  "reservedScopeNames": ["init", "create", "custom-reserved"]
}
```

If a user wants to use a reserved word (not recommended), they can:
1. Remove it from `reservedScopeNames` in their config
2. Use `workflow config add scope --force` to bypass validation

**Validation Tools:**

```bash
# Validate configuration including scope names
workflow config validate

# List reserved scope names
workflow config list reserved

# Add a new scope (validates against reserved names)
workflow config add scope
```

---

## Interactive Scope Definition (If Creating New)

For each scope, ask:

**Prompt:**
> "Scope #[N] - Name: (lowercase, alphanumeric, hyphens only)"

After name is provided:

**Prompt:**
> "Description for '[scope-name]': (minimum 10 characters, be specific)"

After description:

**Prompt:**
> "Emoji for '[scope-name]': (optional, press Enter to skip)"

After emoji:

**Prompt:**
> "Category for '[scope-name]':
> 1. auth - Authentication & Authorization
> 2. features - Features & Functionality
> 3. infrastructure - Infrastructure & DevOps
> 4. documentation - Documentation
> 5. testing - Testing & QA
> 6. performance - Performance & Optimization
> 7. other - Other
> 8. (none) - No category
> 
> Choose 1-8:"

After each scope:

**Prompt:**
> "✓ Added scope: [scope-name]
> 
> You have [N] scopes. Add another? (y/n)"

---

## Example Interaction Flow

```
Agent: What is the primary domain or industry for this project?
User: Healthcare SaaS platform

Agent: What are the main feature areas of your healthcare SaaS? 
      (aim for 8-15 areas)
User: patient records, appointments, billing, insurance, 
      prescriptions, lab results, messaging, reports

Agent: What naming style do you prefer?
      1. Single words (patients, billing)
      2. Kebab-case (patient-records, lab-results)
      3. Descriptive (patient-record-management)
User: Option 2, kebab-case

Agent: Do your scopes map to folders, features, or both?
User: Both - they match our src/ folder structure

Agent: Are you migrating existing scopes or creating new?
User: Creating new

Agent: Scope #1 - Name:
User: patient-records

Agent: Description for 'patient-records':
User: Patient medical records and history management

Agent: Emoji for 'patient-records': (optional)
User: 📋

Agent: Category for 'patient-records':
User: 2 (features)

Agent: ✓ Added scope: patient-records
      You have 1 scope. Add another? (y/n)
User: y

[Continue for remaining scopes...]
```

---

## Error Handling

If user provides invalid input:

**For invalid scope name:**
> "The name '[name]' is invalid. Scope names must be:
> - Lowercase letters, numbers, and hyphens only
> - Maximum 32 characters
> - Not a reserved word (init, create, build, test, config, docs, ci, deps)
> 
> Please provide a different name:"

**For short description:**
> "The description must be at least 10 characters to be meaningful. 
> Please provide more detail about what '[scope-name]' covers:"

**For duplicate name:**
> "A scope named '[name]' already exists. Please choose a different name:"

---

## Post-Creation Instructions

After successfully creating the package, provide:

1. **Location confirmation:**
   > "✨ Custom scope package created at: [path]"

2. **Next steps:**
   > "Next steps:
   > 1. cd [path]
   > 2. pnpm install
   > 3. pnpm build
   > 4. pnpm test
   > 5. Update repository URL in package.json"

3. **Publishing instructions** (if user indicated intent):
   > "To publish to npm:
   > 1. npm login
   > 2. Update version in package.json as needed
   > 3. pnpm publish --access public"

4. **Usage instructions:**
   > "To use in other projects:
   > pnpm add @workflow/scopes-[name]"

---

## Summary: Key Principles

1. ✅ **Always ask** - never assume project details
2. ✅ **Validate input** - check all constraints before proceeding
3. ✅ **Provide examples** - show users what good input looks like
4. ✅ **Confirm before creating** - review all scopes with user
5. ✅ **Give clear next steps** - don't leave users wondering what to do next

---

## Automation Support

For non-interactive/CI environments, support these flags:

```bash
workflow scope:create \
  --name fintech \
  --preset-name "FinTech Application" \
  --scopes "auth:Authentication and security:🔐:auth,payments:Payment processing:💳:features,accounts:Account management:👤:features"
```

Format: `name:description:emoji:category` (comma-separated)

---

**Remember: The goal is to create scopes that genuinely reflect the user's project structure and workflow. Taking time to ask the right questions upfront leads to better, more useful scope packages.**
