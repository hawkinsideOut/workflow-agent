import * as vscode from "vscode";
import { ConfigManager } from "./config";
import { StatusBarManager } from "./statusBar";
import { ValidationProvider } from "./validation";

export class CommandRegistry {
  constructor(
    private configManager: ConfigManager,
    private statusBar: StatusBarManager,
    private validation: ValidationProvider,
  ) {}

  registerAll(context: vscode.ExtensionContext): void {
    // Initialize command
    context.subscriptions.push(
      vscode.commands.registerCommand("workflow-agent.init", () =>
        this.initCommand(),
      ),
    );

    // Validate command
    context.subscriptions.push(
      vscode.commands.registerCommand("workflow-agent.validate", () =>
        this.validateCommand(),
      ),
    );

    // Suggest command
    context.subscriptions.push(
      vscode.commands.registerCommand("workflow-agent.suggest", () =>
        this.suggestCommand(),
      ),
    );

    // Doctor command
    context.subscriptions.push(
      vscode.commands.registerCommand("workflow-agent.doctor", () =>
        this.doctorCommand(),
      ),
    );

    // Show config command
    context.subscriptions.push(
      vscode.commands.registerCommand("workflow-agent.showConfig", () =>
        this.showConfigCommand(),
      ),
    );
  }

  private async initCommand(): Promise<void> {
    const terminal = vscode.window.createTerminal("Workflow Agent");
    terminal.show();
    terminal.sendText("workflow init");
  }

  private async validateCommand(): Promise<void> {
    const branch = this.configManager.getCurrentBranch();

    if (!branch) {
      vscode.window.showErrorMessage("Not in a git repository");
      return;
    }

    const result = this.validation.validateBranch(branch);

    if (result.valid) {
      vscode.window.showInformationMessage(`✓ Branch '${branch}' is valid`);
      this.statusBar.updateStatus(true, "Branch is valid");
    } else {
      vscode.window.showErrorMessage(`✗ Invalid branch: ${result.message}`);
      this.statusBar.updateStatus(false, result.message);
    }
  }

  private async suggestCommand(): Promise<void> {
    const feedback = await vscode.window.showInputBox({
      prompt: "Enter your improvement suggestion",
      placeHolder: "e.g., Add support for GitLab repositories",
      validateInput: (value) => {
        if (value.length < 10) {
          return "Suggestion must be at least 10 characters";
        }
        if (value.length > 1000) {
          return "Suggestion must be less than 1000 characters";
        }
        return null;
      },
    });

    if (!feedback) {
      return;
    }

    const category = await vscode.window.showQuickPick(
      [
        { label: "✨ Feature Request", value: "feature" },
        { label: "🐛 Bug Report", value: "bug" },
        { label: "📚 Documentation", value: "documentation" },
        { label: "⚡ Performance", value: "performance" },
        { label: "💡 Other", value: "other" },
      ],
      {
        placeHolder: "Select suggestion category",
      },
    );

    if (!category) {
      return;
    }

    const terminal = vscode.window.createTerminal("Workflow Agent");
    terminal.show();
    terminal.sendText(
      `workflow suggest "${feedback}" --category ${category.value}`,
    );
  }

  private async doctorCommand(): Promise<void> {
    const terminal = vscode.window.createTerminal("Workflow Agent");
    terminal.show();
    terminal.sendText("workflow doctor");
  }

  private async showConfigCommand(): Promise<void> {
    if (!this.configManager.hasConfig()) {
      const action = await vscode.window.showInformationMessage(
        "Workflow Agent is not initialized in this workspace",
        "Initialize Now",
      );

      if (action === "Initialize Now") {
        this.initCommand();
      }
      return;
    }

    const projectName = this.configManager.getProjectName();
    const scopes = this.configManager.getScopes();
    const enforcement = this.configManager.getEnforcement();
    const branch = this.configManager.getCurrentBranch();

    const info = [
      `**Project:** ${projectName || "Unknown"}`,
      `**Branch:** ${branch || "Unknown"}`,
      `**Enforcement:** ${enforcement}`,
      `**Scopes (${scopes.length}):** ${scopes.join(", ") || "None"}`,
    ].join("\n\n");

    const panel = vscode.window.createWebviewPanel(
      "workflowConfig",
      "Workflow Configuration",
      vscode.ViewColumn.One,
      {},
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              padding: 20px;
              font-family: var(--vscode-font-family);
              color: var(--vscode-foreground);
            }
            h1 {
              border-bottom: 1px solid var(--vscode-panel-border);
              padding-bottom: 10px;
            }
            .info {
              line-height: 1.8;
            }
            .scope-list {
              margin-top: 10px;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .scope {
              background: var(--vscode-badge-background);
              color: var(--vscode-badge-foreground);
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <h1>🚀 Workflow Agent Configuration</h1>
          <div class="info">
            <p><strong>Project:</strong> ${projectName || "Unknown"}</p>
            <p><strong>Current Branch:</strong> ${branch || "Unknown"}</p>
            <p><strong>Enforcement Mode:</strong> ${enforcement}</p>
            <p><strong>Available Scopes:</strong></p>
            <div class="scope-list">
              ${scopes.map((s) => `<span class="scope">${s}</span>`).join("")}
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
