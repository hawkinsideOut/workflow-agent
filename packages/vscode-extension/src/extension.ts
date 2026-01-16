import * as vscode from "vscode";
import { StatusBarManager } from "./statusBar";
import { ValidationProvider } from "./validation";
import { ConfigManager } from "./config";
import { CommandRegistry } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  console.log("Workflow Agent extension activating...");

  // Initialize managers
  const configManager = new ConfigManager();
  const statusBar = new StatusBarManager();
  const validationProvider = new ValidationProvider(configManager);
  const commands = new CommandRegistry(
    configManager,
    statusBar,
    validationProvider,
  );

  // Register commands
  commands.registerAll(context);

  // Set up status bar
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Set up validation
  validationProvider.activate(context);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("workflow-agent")) {
        configManager.reload();
        statusBar.update();
      }
    }),
  );

  // Watch for git changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.fileName.includes(".git/COMMIT_EDITMSG")) {
        validationProvider.validateCommitMessage(e.document);
      }
    }),
  );

  console.log("Workflow Agent extension activated!");
}

export function deactivate() {
  console.log("Workflow Agent extension deactivating...");
}
