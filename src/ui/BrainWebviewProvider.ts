import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectBrain } from '../core/brain/ProjectBrain.js';
import { ContextCard, ProjectBrainState } from '../types/index.js';
import { AgentExporter } from '../core/export/AgentExporter.js';

export class BrainWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'nivora.brainWebview';
  private view?: vscode.WebviewView;
  private brain: ProjectBrain;
  private currentCard: ContextCard | null = null;
  private currentState: ProjectBrainState | null = null;

  constructor(private readonly extensionUri: vscode.Uri, brain: ProjectBrain) {
    this.brain = brain;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case 'whatShouldIKnow': {
          const editor = vscode.window.activeTextEditor;
          const target = data.targetPath || editor?.document.uri.fsPath;
          if (target) {
            await this.displayCardForFile(target);
          } else {
            vscode.window.showInformationMessage('Nivora: Open a file in the editor to inspect context.');
          }
          break;
        }
        case 'askQuestion': {
          if (data.query) {
            await this.handleAskQuestion(data.query);
          }
          break;
        }
        case 'recordDecision': {
          await this.promptAndRecordDecision();
          break;
        }
        case 'refreshState': {
          await this.refresh();
          break;
        }
        case 'copyHandoff': {
          if (this.currentCard) {
            const markdown = AgentExporter.toMarkdownHandoff(this.currentCard);
            await vscode.env.clipboard.writeText(markdown);
            vscode.window.showInformationMessage('Nivora: Context handoff prompt copied to clipboard!');
          }
          break;
        }
        case 'openFile': {
          if (data.filePath) {
            const full = path.isAbsolute(data.filePath)
              ? data.filePath
              : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', data.filePath);
            try {
              const doc = await vscode.workspace.openTextDocument(full);
              await vscode.window.showTextDocument(doc);
            } catch (err: any) {
              vscode.window.showErrorMessage(`Nivora: Could not open file: ${err.message}`);
            }
          }
          break;
        }
      }
    });

    // Initial load
    this.refresh();
  }

  public async refresh() {
    this.currentState = await this.brain.sync();
    if (this.view) {
      this.view.webview.postMessage({
        type: 'stateUpdate',
        state: this.currentState,
        card: this.currentCard,
      });
    }
  }

  public async displayCardForFile(filePath: string) {
    if (!this.view) return;
    this.view.show?.(true);

    this.view.webview.postMessage({ type: 'loading', message: `Analyzing ${path.basename(filePath)}...` });
    try {
      this.currentCard = await this.brain.whatShouldIKnow(filePath);
      this.view.webview.postMessage({
        type: 'cardUpdate',
        card: this.currentCard,
        state: this.currentState || this.brain.getState(),
      });
    } catch (err: any) {
      vscode.window.showErrorMessage(`Nivora analysis error: ${err.message}`);
    }
  }

  private async handleAskQuestion(query: string) {
    if (!this.view) return;
    this.view.webview.postMessage({ type: 'askLoading' });
    try {
      const result = await this.brain.ask(query);
      this.view.webview.postMessage({
        type: 'askResult',
        query,
        answer: result.answer,
        confidence: result.confidence,
        files: result.relevantFiles,
      });
    } catch (err: any) {
      this.view.webview.postMessage({
        type: 'askResult',
        query,
        answer: `Error analyzing query: ${err.message}`,
        confidence: 0,
        files: [],
      });
    }
  }

  private async promptAndRecordDecision() {
    const title = await vscode.window.showInputBox({
      title: 'Record Architectural Decision (ADR)',
      prompt: 'Enter a clear title for this decision (e.g. "Use JWT tokens for mobile clients")',
    });
    if (!title) return;

    const reason = await vscode.window.showInputBox({
      title: 'Decision Rationale & Context',
      prompt: 'Explain why this decision was made and what problem it solves',
    });
    if (!reason) return;

    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    const affected = activeFile ? [vscode.workspace.asRelativePath(activeFile)] : [];

    const decision = await this.brain.recordDecision(title, reason, affected);
    vscode.window.showInformationMessage(`Nivora: Recorded ${decision.id} — "${decision.title}"!`);
    await this.refresh();
  }

  private getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nivora Project Brain</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #1e1e2e);
      --fg: var(--vscode-sideBar-foreground, #cdd6f4);
      --card-bg: var(--vscode-editor-background, #181825);
      --border: var(--vscode-widget-border, #313244);
      --accent: var(--vscode-button-background, #89b4fa);
      --accent-fg: var(--vscode-button-foreground, #11111b);
      --warn: #f9e2af;
      --error: #f38ba8;
      --success: #a6e3a1;
      --muted: var(--vscode-descriptionForeground, #a6adc8);
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background-color: var(--bg);
      margin: 0;
      padding: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }
    .title {
      font-weight: 700;
      font-size: 1.1em;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-blue { background: rgba(137, 180, 250, 0.2); color: #89b4fa; }
    .badge-green { background: rgba(166, 227, 161, 0.2); color: #a6e3a1; }
    .badge-warn { background: rgba(249, 226, 175, 0.2); color: #f9e2af; }
    .badge-error { background: rgba(243, 139, 168, 0.2); color: #f38ba8; }
    .badge-purple { background: rgba(203, 166, 247, 0.2); color: #cba6f7; }

    .health-bar-container {
      margin: 10px 0 12px 0;
      background: var(--card-bg);
      padding: 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .health-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .progress-bar-bg {
      background: #313244;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #89b4fa, #a6e3a1);
      transition: width 0.3s ease;
    }

    /* Ask Nivora Chat Box */
    .ask-box {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    }
    .ask-input {
      flex: 1;
      padding: 8px 10px;
      background: var(--card-bg);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 12px;
      outline: none;
    }
    .ask-input:focus {
      border-color: var(--accent);
    }
    .btn-ask {
      padding: 8px 12px;
      background: var(--accent);
      color: var(--accent-fg);
      border: none;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }

    .btn {
      display: block;
      width: 100%;
      padding: 8px 12px;
      background: var(--accent);
      color: var(--accent-fg);
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      margin-bottom: 8px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-secondary {
      background: transparent;
      color: var(--fg);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.05); }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-top: 10px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      word-break: break-all;
    }
    .confidence-meter {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      padding: 6px 8px;
      background: rgba(0,0,0,0.25);
      border-radius: 4px;
    }
    .confidence-num {
      font-size: 16px;
      font-weight: 800;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      margin: 12px 0 4px 0;
      font-weight: 600;
    }
    .list-item {
      margin-bottom: 6px;
      font-size: 12px;
      word-break: break-word;
    }
    .clickable {
      color: var(--accent);
      cursor: pointer;
      text-decoration: underline;
    }
    .alert-box {
      padding: 8px;
      border-radius: 4px;
      margin: 6px 0;
      font-size: 12px;
      border-left: 3px solid;
    }
    .alert-warn { background: rgba(249, 226, 175, 0.1); border-color: var(--warn); color: var(--warn); }
    .alert-error { background: rgba(243, 139, 168, 0.1); border-color: var(--error); color: var(--error); }
    .loading-spinner {
      text-align: center;
      padding: 14px;
      color: var(--muted);
      font-style: italic;
    }
    .answer-box {
      background: rgba(137, 180, 250, 0.08);
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 12px;
      font-size: 12px;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="title">
      <span>🧠 NIVORA</span>
      <span class="badge badge-blue">v0.2.0</span>
    </div>
    <div style="display: flex; gap: 4px;">
      <button id="recordDecisionBtn" class="btn-secondary" style="width: auto; padding: 2px 8px; font-size: 11px;">+ ADR</button>
      <button id="refreshBtn" class="btn-secondary" style="width: auto; padding: 2px 8px; font-size: 11px;">Sync</button>
    </div>
  </div>

  <!-- Interactive Search / Ask Box -->
  <div class="ask-box">
    <input type="text" id="askInput" class="ask-input" placeholder="Ask Nivora about this codebase..." />
    <button id="askBtn" class="btn-ask">Ask</button>
  </div>
  <div id="askResultArea"></div>

  <div class="health-bar-container" id="projectOverview">
    <div class="health-header">
      <span id="projName" style="font-weight: 600;">Scanning project...</span>
      <span id="healthPercent" style="font-weight: 700; color: var(--success);">--%</span>
    </div>
    <div class="progress-bar-bg">
      <div id="healthFill" class="progress-bar-fill" style="width: 0%;"></div>
    </div>
    <div style="font-size: 11px; color: var(--muted); margin-top: 6px;" id="archDesc">Architecture: analyzing...</div>
  </div>

  <button id="whatShouldIKnowBtn" class="btn">🔍 What Should I Know Before Changing This?</button>

  <div id="cardContainer">
    <div style="text-align: center; color: var(--muted); padding: 20px 8px; font-size: 12px;">
      Ask a question above or open any file and click <b>"What Should I Know?"</b> (<kbd>Ctrl+Shift+N</kbd>) to inspect symbols, Git decisions, and risks.
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'refreshState' });
    });

    document.getElementById('recordDecisionBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'recordDecision' });
    });

    document.getElementById('whatShouldIKnowBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'whatShouldIKnow' });
    });

    const askInput = document.getElementById('askInput');
    const askBtn = document.getElementById('askBtn');
    function submitAsk() {
      const q = askInput.value.trim();
      if (q) {
        vscode.postMessage({ command: 'askQuestion', query: q });
      }
    }
    askBtn.addEventListener('click', submitAsk);
    askInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAsk();
    });

    // Event delegation for opening files
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-filepath]');
      if (target) {
        const filePath = target.getAttribute('data-filepath');
        if (filePath) {
          vscode.postMessage({ command: 'openFile', filePath });
        }
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'loading') {
        document.getElementById('cardContainer').innerHTML = '<div class="loading-spinner">' + escapeHtml(msg.message) + '</div>';
      } else if (msg.type === 'askLoading') {
        document.getElementById('askResultArea').innerHTML = '<div class="loading-spinner">Searching codebase & architectural decisions...</div>';
      } else if (msg.type === 'askResult') {
        renderAskResult(msg);
      } else if (msg.type === 'stateUpdate') {
        renderState(msg.state);
        if (msg.card) renderCard(msg.card);
      } else if (msg.type === 'cardUpdate') {
        if (msg.state) renderState(msg.state);
        if (msg.card) renderCard(msg.card);
      }
    });

    function renderState(state) {
      if (!state) return;
      document.getElementById('projName').textContent = state.projectName || 'Active Workspace';
      document.getElementById('healthPercent').textContent = state.overallHealth + '%';
      document.getElementById('healthFill').style.width = state.overallHealth + '%';
      document.getElementById('archDesc').textContent = 'Architecture: ' + state.architecture + ' (' + state.filesCount + ' files, ' + (state.decisions ? state.decisions.length : 0) + ' decisions)';
    }

    function renderAskResult(res) {
      const area = document.getElementById('askResultArea');
      let html = '<div class="answer-box">' +
        '<div style="font-weight: 700; margin-bottom: 6px;">Q: "' + escapeHtml(res.query) + '"</div>' +
        '<div style="white-space: pre-wrap; line-height: 1.4;">' + escapeHtml(res.answer) + '</div>';

      if (res.files && res.files.length > 0) {
        html += '<div style="margin-top: 8px; font-weight: 600; font-size: 11px;">Jump to file:</div>';
        res.files.slice(0, 4).forEach(function(f) {
          html += '<div class="clickable list-item" data-filepath="' + escapeHtml(f) + '">→ ' + escapeHtml(f) + '</div>';
        });
      }

      html += '</div>';
      area.innerHTML = html;
    }

    function renderCard(card) {
      if (!card) return;
      const container = document.getElementById('cardContainer');
      const conf = card.confidence;

      let confColor = 'var(--success)';
      if (conf.overall < 50) confColor = 'var(--error)';
      else if (conf.overall < 80) confColor = 'var(--warn)';

      let html = '<div class="card">' +
        '<div class="card-title">' +
          '<span>' + escapeHtml(card.target) + '</span>' +
          '<span class="badge badge-blue">Context Card</span>' +
        '</div>' +
        '<div class="confidence-meter">' +
          '<div class="confidence-num" style="color: ' + confColor + ';">' + conf.overall + '%</div>' +
          '<div style="font-size: 11px; color: var(--muted);">' + escapeHtml(conf.explanation) + '</div>' +
        '</div>' +
        '<button id="copyHandoffBtn" class="btn btn-secondary" style="margin-top: 8px; font-size: 12px;">📋 Copy Context for AI Agent</button>' +
        '<div class="section-title">Purpose</div>' +
        '<div style="font-size: 12px;">' + escapeHtml(card.purpose) + '</div>';

      // Symbols / Functions
      if (card.symbols && card.symbols.length > 0) {
        html += '<div class="section-title">Symbols & Functions (' + card.symbols.length + ')</div>';
        card.symbols.slice(0, 8).forEach(function(s) {
          html += '<div class="list-item">' +
            '<span class="badge badge-purple">' + escapeHtml(s.kind) + '</span> ' +
            '<b>' + escapeHtml(s.name) + '</b> <span style="color: var(--muted); font-size: 11px;">(Line ' + s.line + ')</span>' +
          '</div>';
        });
        if (card.symbols.length > 8) {
          html += '<div style="font-size: 11px; color: var(--muted);">+ ' + (card.symbols.length - 8) + ' more symbols</div>';
        }
      }

      // Decisions (ADRs + Mined)
      if (card.decisions && card.decisions.length > 0) {
        html += '<div class="section-title">Decisions & ADRs (' + card.decisions.length + ')</div>';
        card.decisions.forEach(function(d) {
          const badgeClass = d.id.startsWith('GIT') ? 'badge-blue' : 'badge-green';
          html += '<div class="list-item">' +
            '<span class="badge ' + badgeClass + '">' + escapeHtml(d.id) + '</span> ' +
            '<span class="clickable" data-filepath="' + escapeHtml(d.source) + '">' + escapeHtml(d.title) + '</span>' +
            '<div style="font-size: 11px; color: var(--muted); margin-left: 4px;">' + escapeHtml(d.reason) + '</div>' +
          '</div>';
        });
      }

      // Failed Attempts
      if (card.failedAttempts && card.failedAttempts.length > 0) {
        html += '<div class="section-title">⚠️ Historical Failed Attempts</div>';
        card.failedAttempts.forEach(function(fa) {
          html += '<div class="alert-box alert-warn">' +
            '<b>' + escapeHtml(fa.agent) + '</b> (' + escapeHtml(fa.date) + '): ' +
            'Attempted <i>"' + escapeHtml(fa.attempted) + '"</i><br>' +
            '<span style="color: var(--error);">Reason: ' + escapeHtml(fa.reason) + '</span>' +
          '</div>';
        });
      }

      // Stale warnings
      if (card.staleWarnings && card.staleWarnings.length > 0) {
        html += '<div class="section-title">Stale Knowledge Warnings</div>';
        card.staleWarnings.forEach(function(w) {
          html += '<div class="alert-box alert-warn">⚠️ <b>' + escapeHtml(w.title) + '</b>: ' + escapeHtml(w.message) + '</div>';
        });
      }

      // Known risks
      if (card.knownRisks && card.knownRisks.length > 0) {
        html += '<div class="section-title">Known Risks & Invariants</div>';
        card.knownRisks.forEach(function(r) {
          const alertClass = r.severity === 'high' ? 'alert-error' : 'alert-warn';
          html += '<div class="alert-box ' + alertClass + '"><b>[' + r.severity.toUpperCase() + ']</b> ' + escapeHtml(r.description) + '</div>';
        });
      }

      // Dependent components
      if (card.relatedComponents && card.relatedComponents.length > 0) {
        html += '<div class="section-title">Dependent Components (' + card.relatedComponents.length + ')</div>';
        card.relatedComponents.slice(0, 5).forEach(function(c) {
          html += '<div class="list-item clickable" data-filepath="' + escapeHtml(c) + '">→ ' + escapeHtml(c) + '</div>';
        });
        if (card.relatedComponents.length > 5) {
          html += '<div style="font-size: 11px; color: var(--muted);">+ ' + (card.relatedComponents.length - 5) + ' more</div>';
        }
      }

      // Recent changes
      if (card.recentChanges && card.recentChanges.length > 0) {
        html += '<div class="section-title">Recent Git Changes</div>';
        card.recentChanges.slice(0, 3).forEach(function(ch) {
          html += '<div class="list-item" style="font-size: 11px; color: var(--muted);">• ' + escapeHtml(ch) + '</div>';
        });
      }

      // Evidence
      if (card.evidence && card.evidence.length > 0) {
        html += '<div class="section-title">Verified Evidence (' + card.evidence.length + ')</div>';
        card.evidence.forEach(function(e) {
          html += '<div class="list-item clickable" data-filepath="' + escapeHtml(e.location) + '" style="font-size: 11px;">[ ' + e.type.toUpperCase() + ' ] ' + escapeHtml(e.location) + '</div>';
        });
      }

      html += '</div>';
      container.innerHTML = html;

      const copyBtn = document.getElementById('copyHandoffBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          vscode.postMessage({ command: 'copyHandoff' });
        });
      }
    }
  </script>
</body>
</html>`;
  }
}
