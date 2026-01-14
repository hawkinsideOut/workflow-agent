import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

export class ConfigManager {
  private workspaceConfig: any = null;
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.reload();
  }

  reload(): void {
    if (!this.workspaceRoot) {
      this.workspaceConfig = null;
      return;
    }

    const configPath = join(this.workspaceRoot, 'workflow.config.json');
    
    if (existsSync(configPath)) {
      try {
        delete require.cache[require.resolve(configPath)];
        this.workspaceConfig = require(configPath);
      } catch (error) {
        console.error('Failed to load workflow config:', error);
        this.workspaceConfig = null;
      }
    } else {
      this.workspaceConfig = null;
    }
  }

  hasConfig(): boolean {
    return this.workspaceConfig !== null;
  }

  getScopes(): string[] {
    if (!this.workspaceConfig?.scopes) {
      return [];
    }
    return this.workspaceConfig.scopes.map((s: any) => s.name);
  }

  getProjectName(): string | undefined {
    return this.workspaceConfig?.projectName;
  }

  getEnforcement(): string {
    return this.workspaceConfig?.enforcement || 'advisory';
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('workflow-agent');
    return config.get<boolean>('enabled', true);
  }

  shouldValidateOnType(): boolean {
    const config = vscode.workspace.getConfiguration('workflow-agent');
    return config.get<boolean>('validateOnType', true);
  }

  shouldShowStatusBar(): boolean {
    const config = vscode.workspace.getConfiguration('workflow-agent');
    return config.get<boolean>('showStatusBar', true);
  }

  isStrictMode(): boolean {
    const config = vscode.workspace.getConfiguration('workflow-agent');
    return config.get<boolean>('strictMode', false);
  }

  getCurrentBranch(): string | null {
    if (!this.workspaceRoot) return null;

    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
      }).trim();
      return branch;
    } catch {
      return null;
    }
  }
}
