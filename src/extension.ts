import * as vscode from 'vscode';
import { CacheManager } from './core/cache/CacheManager.js';

let cacheManager: CacheManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();

  cacheManager = new CacheManager(workspaceRoot);
  await cacheManager.init();

  console.log('Nivora Context Project Brain activated.');

  // Command: What Should I Know Before Modifying This?
  const whatShouldIKnowCmd = vscode.commands.registerCommand('nivora.whatShouldIKnow', async (uri?: vscode.Uri) => {
    let targetPath = uri?.fsPath;
    if (!targetPath && vscode.window.activeTextEditor) {
      targetPath = vscode.window.activeTextEditor.document.uri.fsPath;
    }

    if (!targetPath) {
      vscode.window.showInformationMessage('Nivora: Open or select a file to inspect project context.');
      return;
    }

    vscode.window.showInformationMessage(`Nivora Project Brain: Analyzing ${targetPath}...`);
  });

  // Command: Refresh Project Brain
  const refreshContextCmd = vscode.commands.registerCommand('nivora.refreshContext', async () => {
    vscode.window.showInformationMessage('Nivora: Refreshing project context knowledge...');
  });

  // Command: Export Context Card
  const exportContextCmd = vscode.commands.registerCommand('nivora.exportContext', async () => {
    vscode.window.showInformationMessage('Nivora: Exporting context card...');
  });

  context.subscriptions.push(whatShouldIKnowCmd, refreshContextCmd, exportContextCmd);
}

export function deactivate() {
  if (cacheManager) {
    cacheManager.flush();
  }
}
