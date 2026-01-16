import * as vscode from "vscode";
import { ConfigManager } from "./config";

export class ValidationProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(private configManager: ConfigManager) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("workflow-agent");
  }

  activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.diagnosticCollection);

    // Validate on file open
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.fileName.includes(".git/COMMIT_EDITMSG")) {
        this.validateCommitMessage(doc);
      }
    });

    // Validate on change
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (
        this.configManager.shouldValidateOnType() &&
        e.document.fileName.includes(".git/COMMIT_EDITMSG")
      ) {
        this.validateCommitMessage(e.document);
      }
    });
  }

  validateCommitMessage(document: vscode.TextDocument): void {
    const text = document.getText();
    const firstLine = text.split("\n")[0];

    if (!firstLine || firstLine.startsWith("#")) {
      return; // Empty or comment
    }

    const diagnostics: vscode.Diagnostic[] = [];

    // Check conventional commit format: type(scope): description
    const commitPattern =
      /^(feat|fix|refactor|chore|docs|test|perf|style|ci|build|revert)\(([a-z0-9-]+)\): .{10,}/;

    if (!commitPattern.test(firstLine)) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, firstLine.length),
        "Commit message must follow format: type(scope): description",
        vscode.DiagnosticSeverity.Error,
      );
      diagnostic.code = "workflow-commit-format";
      diagnostic.source = "workflow-agent";
      diagnostics.push(diagnostic);
    } else {
      // Validate scope
      const match = firstLine.match(/\(([a-z0-9-]+)\)/);
      if (match) {
        const scope = match[1];
        const validScopes = this.configManager.getScopes();

        if (validScopes.length > 0 && !validScopes.includes(scope)) {
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(
              0,
              firstLine.indexOf(scope),
              0,
              firstLine.indexOf(scope) + scope.length,
            ),
            `Invalid scope '${scope}'. Valid scopes: ${validScopes.join(", ")}`,
            vscode.DiagnosticSeverity.Warning,
          );
          diagnostic.code = "workflow-invalid-scope";
          diagnostic.source = "workflow-agent";
          diagnostics.push(diagnostic);
        }
      }
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  validateBranch(branchName: string): { valid: boolean; message?: string } {
    // Branch pattern: <type>/<scope>/<description>
    const branchPattern =
      /^(feature|bugfix|hotfix|chore|refactor|docs|test)\/([a-z0-9-]+)\/[a-z0-9-]+$/;

    if (!branchPattern.test(branchName)) {
      return {
        valid: false,
        message: "Branch name must follow: <type>/<scope>/<description>",
      };
    }

    // Extract and validate scope
    const parts = branchName.split("/");
    if (parts.length >= 2) {
      const scope = parts[1];
      const validScopes = this.configManager.getScopes();

      if (validScopes.length > 0 && !validScopes.includes(scope)) {
        return {
          valid: false,
          message: `Invalid scope '${scope}'. Valid: ${validScopes.join(", ")}`,
        };
      }
    }

    return { valid: true };
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
