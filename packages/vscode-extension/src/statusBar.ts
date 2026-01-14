import * as vscode from 'vscode';
import { ConfigManager } from './config';

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'workflow-agent.showConfig';
  }

  show(): void {
    this.statusBarItem.show();
    this.update();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  update(config?: ConfigManager): void {
    if (!config) {
      this.statusBarItem.text = '$(workflow) Workflow';
      this.statusBarItem.tooltip = 'Workflow Agent - Not configured';
      return;
    }

    const branch = config.getCurrentBranch();
    const hasConfig = config.hasConfig();

    if (!hasConfig) {
      this.statusBarItem.text = '$(workflow) Workflow: Not initialized';
      this.statusBarItem.tooltip = 'Click to initialize Workflow Agent';
      this.statusBarItem.command = 'workflow-agent.init';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      return;
    }

    const enforcement = config.getEnforcement();
    const icon = enforcement === 'strict' ? '$(shield)' : '$(check)';
    
    this.statusBarItem.text = `${icon} Workflow: ${branch || 'Unknown'}`;
    this.statusBarItem.tooltip = `Workflow Agent\nBranch: ${branch}\nEnforcement: ${enforcement}\nClick for details`;
    this.statusBarItem.backgroundColor = undefined;
  }

  updateStatus(valid: boolean, message?: string): void {
    if (valid) {
      this.statusBarItem.backgroundColor = undefined;
      if (message) {
        this.statusBarItem.tooltip = message;
      }
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      if (message) {
        this.statusBarItem.tooltip = `⚠ ${message}`;
      }
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
