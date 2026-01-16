# Workflow Agent - VS Code Extension

Real-time workflow validation and enforcement for VS Code.

## Features

### 🔍 Real-Time Validation

- **Commit Message Validation**: Validates conventional commit format as you type
- **Branch Name Validation**: Checks branch naming patterns against your workflow config
- **Scope Validation**: Ensures scopes match your project's defined scopes

### 📊 Status Bar Integration

- Shows current branch name and enforcement mode
- Visual indicators for validation state (green = valid, yellow = warning, red = error)
- Click to view full configuration

### ⌨️ Command Palette

Access all Workflow Agent features from the command palette:

- `Workflow: Initialize` - Set up workflow configuration
- `Workflow: Validate Branch` - Validate current branch name (Ctrl+Shift+W / Cmd+Shift+W)
- `Workflow: Suggest Improvement` - Submit a suggestion to the improvement tracker
- `Workflow: Run Doctor` - Check for configuration issues
- `Workflow: Show Configuration` - View current workflow configuration

### 💡 IntelliSense

- Autocomplete for commit scopes
- Hover tooltips for validation errors
- Quick fixes for common issues

## Installation

### From VSIX

1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded file

### From Marketplace

```bash
code --install-extension workflow-agent
```

## Configuration

### Extension Settings

Configure the extension through VS Code settings:

```json
{
  "workflowAgent.enabled": true,
  "workflowAgent.validateOnType": true,
  "workflowAgent.showStatusBar": true,
  "workflowAgent.autoSuggest": false,
  "workflowAgent.strictMode": false
}
```

### Workspace Configuration

Initialize workflow configuration in your workspace:

1. Open command palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run `Workflow: Initialize`
3. Select a preset or create custom configuration

Or use the CLI:

```bash
workflow init --preset library --name my-project
```

## Usage

### Validating Commits

The extension automatically validates commit messages as you type in:

- Git commit input boxes
- `.git/COMMIT_EDITMSG` files
- SCM view commit message field

Invalid messages will show:

- Red squiggly underlines in the editor
- Diagnostic messages in the Problems panel
- Error icons in the status bar

### Validating Branches

Press `Ctrl+Shift+W` (or `Cmd+Shift+W` on Mac) to validate the current branch name.

Valid branch format:

```
<type>/<scope>/<description>
```

Examples:

- ✅ `feature/auth/add-oauth`
- ✅ `bugfix/api/fix-rate-limit`
- ✅ `docs/readme/update-installation`
- ❌ `fix-bug`
- ❌ `feature_new_thing`

### Suggesting Improvements

1. Open command palette
2. Run `Workflow: Suggest Improvement`
3. Enter your suggestion
4. Select a category (feature, bug, documentation, etc.)
5. Suggestion is submitted to the improvement tracker

## Troubleshooting

### Extension Not Working

1. Check if workflow is initialized: Look for `workflow.config.json` in workspace root
2. Run `Workflow: Run Doctor` to diagnose issues
3. Check Output panel → "Workflow Agent" for errors

### Validation Not Triggering

1. Ensure `workflowAgent.enabled` is `true`
2. Check if you're in a git repository
3. Verify `workflow.config.json` exists and is valid

### Status Bar Not Showing

1. Ensure `workflowAgent.showStatusBar` is `true`
2. Check if you're in a git repository
3. Try reloading the window (Ctrl+R)

## Development

### Building

```bash
pnpm install
pnpm build
```

### Testing

```bash
# Launch extension development host
pnpm dev

# Run in VS Code
# Press F5 to open Extension Development Host
```

### Packaging

```bash
pnpm package
```

Creates a `.vsix` file in the root directory.

## License

MIT - see [LICENSE](../../LICENSE)
