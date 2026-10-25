import * as vscode from 'vscode';
import { WildAiClient } from './apiClient';
import { ChatMessage, WebviewMessage } from './types';

export class WildAiChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'wildai.chatView';
  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  private _abortController?: AbortController;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _client: WildAiClient,
    private readonly _secretStorage: vscode.SecretStorage
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
      switch (data.type) {
        case 'sendMessage':
          if (data.text) {
            await this.handleUserMessage(data.text);
          }
          break;
        case 'insertCode':
          if (data.code) {
            this.insertCodeIntoEditor(data.code);
          }
          break;
        case 'clearHistory':
          this.clearHistory();
          break;
        case 'openSettings':
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'wildai'
          );
          break;
      }
    });
  }

  public async executeCommandPrompt(prompt: string, contextCode?: string) {
    if (!this._view) {
      await vscode.commands.executeCommand('wildai.chatView.focus');
    }

    let fullPrompt = prompt;
    if (contextCode) {
      fullPrompt = `${prompt}\n\n\`\`\`\n${contextCode}\n\`\`\``;
    }

    await this.handleUserMessage(fullPrompt);
  }

  public clearHistory() {
    this._messages = [];
    this._view?.webview.postMessage({ type: 'clear' });
  }

  private async handleUserMessage(text: string) {
    if (!this._view) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    this._messages.push(userMsg);
    this._view.webview.postMessage({
      type: 'addMessage',
      message: userMsg,
    });

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    this._view.webview.postMessage({
      type: 'startStream',
      message: assistantMsg,
    });

    const token = await this._secretStorage.get('wildai.apiToken');
    const config = vscode.workspace.getConfiguration('wildai');
    this._client.updateOptions({
      apiUrl: config.get<string>('apiUrl', 'https://v2.wildai.pl/api'),
      apiToken: token,
      model: config.get<string>('model', 'wildai-default'),
      temperature: config.get<number>('temperature', 0.7),
    });

    this._abortController = new AbortController();

    await this._client.streamChat(
      this._messages,
      (chunk: string) => {
        assistantMsg.content += chunk;
        this._view?.webview.postMessage({
          type: 'streamChunk',
          chunk,
        });
      },
      () => {
        this._messages.push(assistantMsg);
        this._view?.webview.postMessage({
          type: 'endStream',
          fullContent: assistantMsg.content,
        });
        this._abortController = undefined;
      },
      (error: Error) => {
        this._view?.webview.postMessage({
          type: 'streamError',
          error: error.message,
        });
        this._abortController = undefined;
      },
      this._abortController.signal
    );
  }

  private insertCodeIntoEditor(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('WildAI: No active text editor found.');
      return;
    }

    editor.edit((editBuilder) => {
      if (editor.selection.isEmpty) {
        editBuilder.insert(editor.selection.active, code);
      } else {
        editBuilder.replace(editor.selection, code);
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'assets', 'icon.png')
    );
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WildAI Chat</title>
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${iconUri}" alt="WildAI" />
      <span>WildAI</span>
    </div>
    <div class="actions">
      <button class="btn-icon" id="btn-clear" title="Clear chat">🗑️ Clear</button>
      <button class="btn-icon" id="btn-settings" title="Settings">⚙️</button>
    </div>
  </div>

  <div class="messages-container" id="messages">
    <div class="empty-state" id="empty-state">
      <img src="${iconUri}" alt="WildAI" />
      <p>Ask anything, or highlight code in the editor and run refactoring or test generation.</p>
    </div>
  </div>

  <div class="chips">
    <button class="chip" data-cmd="/explain">💡 Explain</button>
    <button class="chip" data-cmd="/refactor">⚡ Refactor</button>
    <button class="chip" data-cmd="/test">🧪 Generate Tests</button>
    <button class="chip" data-cmd="/fix">🐛 Fix Bugs</button>
  </div>

  <div class="input-box">
    <textarea id="prompt-input" placeholder="Ask WildAI... (Shift+Enter for new line)"></textarea>
    <div class="send-row">
      <button class="btn-send" id="btn-send">Send</button>
    </div>
  </div>

  <script src="${jsUri}"></script>
</body>
</html>`;
  }
}
