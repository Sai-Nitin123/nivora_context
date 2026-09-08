import * as vscode from 'vscode';
import { ProjectBrain } from './core/brain/ProjectBrain.js';
import { BrainWebviewProvider } from './ui/BrainWebviewProvider.js';
import { AgentExporter } from './core/export/AgentExporter.js';
import { McpServer } from './core/mcp/McpServer.js';

let brain: ProjectBrain | null = null;
let mcpServer: McpServer | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceRoot =
    workspaceFolders && workspaceFolders.length > 0
      ? workspaceFolders[0].uri.fsPath
      : process.cwd();

  brain = new ProjectBrain(workspaceRoot);
  await brain.init();
  mcpServer = new McpServer(brain);

  // Register Activity Bar Sidebar Webview Provider
  const provider = new BrainWebviewProvider(context.extensionUri, brain);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(BrainWebviewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  console.log('Nivora Context Project Brain activated successfully.');

  // Signature Command: What Should I Know Before Modifying This? (Ctrl+Shift+N)
  const whatShouldIKnowCmd = vscode.commands.registerCommand(
    'nivora.whatShouldIKnow',
    async (uri?: vscode.Uri) => {
      let targetPath = uri?.fsPath;
      if (!targetPath && vscode.window.activeTextEditor) {
        targetPath = vscode.window.activeTextEditor.document.uri.fsPath;
      }

      if (!targetPath) {
        vscode.window.showInformationMessage('Nivora: Open or select a file in the editor first.');
        return;
      }

      // Show in webview
      await provider.displayCardForFile(targetPath);

      // Also provide a quick status message with one-click copy action
      const card = await brain!.whatShouldIKnow(targetPath);
      const action = await vscode.window.showInformationMessage(
        `Nivora: ${card.target} (Confidence: ${card.confidence.overall}%)`,
        '📋 Copy Context for AI',
        'Open Brain'
      );

      if (action === '📋 Copy Context for AI') {
        const md = AgentExporter.toMarkdownHandoff(card);
        await vscode.env.clipboard.writeText(md);
        vscode.window.showInformationMessage('Nivora: Context handoff prompt copied to clipboard!');
      } else if (action === 'Open Brain') {
        vscode.commands.executeCommand('nivora.brainWebview.focus');
      }
    }
  );

  // Command: Refresh Project Brain
  const refreshContextCmd = vscode.commands.registerCommand('nivora.refreshContext', async () => {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Nivora: Synchronizing Project Brain...',
        cancellable: false,
      },
      async () => {
        await provider.refresh();
        const state = brain!.getState();
        vscode.window.showInformationMessage(
          `Nivora: Brain updated! Health: ${state?.overallHealth}%, ${state?.filesCount} files, ${state?.decisions.length} ADRs.`
        );
      }
    );
  });

  // Command: Export Context Card
  const exportContextCmd = vscode.commands.registerCommand(
    'nivora.exportContext',
    async (uri?: vscode.Uri) => {
      let targetPath = uri?.fsPath;
      if (!targetPath && vscode.window.activeTextEditor) {
        targetPath = vscode.window.activeTextEditor.document.uri.fsPath;
      }

      if (!targetPath) {
        vscode.window.showInformationMessage('Nivora: Open or select a file to export context.');
        return;
      }

      const card = await brain!.whatShouldIKnow(targetPath);
      const md = AgentExporter.toMarkdownHandoff(card);
      await vscode.env.clipboard.writeText(md);
      vscode.window.showInformationMessage(
        `Nivora: Context handoff prompt for ${card.target} copied to clipboard!`
      );
    }
  );

  context.subscriptions.push(whatShouldIKnowCmd, refreshContextCmd, exportContextCmd);
}

export function deactivate() {
  if (brain) {
    brain.cacheManager.flush();
  }
}

/**
 * Programmatic export for external tool/agent integrations
 */
export function getMcpServer(): McpServer | null {
  return mcpServer;
}
