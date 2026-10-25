import * as vscode from 'vscode';
import { WildAiClient } from './apiClient';
import { WildAiChatViewProvider } from './chatViewProvider';

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('wildai');

  const client = new WildAiClient({
    apiUrl: config.get<string>('apiUrl', 'https://chat.wildai.pl/api/chat'),
    model: config.get<string>('model', 'deepseek-v4.1-flash-uncensored'),
    temperature: config.get<number>('temperature', 0.7),
  });

  const chatProvider = new WildAiChatViewProvider(
    context.extensionUri,
    client,
    context.secrets
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WildAiChatViewProvider.viewType,
      chatProvider
    )
  );

  // Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'wildai.openChat';
  statusBarItem.text = '$(sparkle) WildAI';
  statusBarItem.tooltip = 'Open WildAI Assistant';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Commands
  const getSelectedCode = (): string | undefined => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return undefined;
    const selection = editor.selection;
    if (selection.isEmpty) return undefined;
    return editor.document.getText(selection);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('wildai.openChat', async () => {
      await vscode.commands.executeCommand('wildai.chatView.focus');
    }),

    vscode.commands.registerCommand('wildai.explainCode', async () => {
      const code = getSelectedCode();
      if (!code) {
        vscode.window.showWarningMessage(
          'WildAI: Please select some code in the active editor first.'
        );
        return;
      }
      await chatProvider.executeCommandPrompt(
        'Please explain the following code in detail, discussing its logic, potential edge cases, and time/space complexity:',
        code
      );
    }),

    vscode.commands.registerCommand('wildai.refactorCode', async () => {
      const code = getSelectedCode();
      if (!code) {
        vscode.window.showWarningMessage(
          'WildAI: Please select some code in the active editor first.'
        );
        return;
      }
      await chatProvider.executeCommandPrompt(
        'Please refactor the following code to improve readability, performance, and best practices. Provide the updated code snippet ready for insertion:',
        code
      );
    }),

    vscode.commands.registerCommand('wildai.generateTests', async () => {
      const code = getSelectedCode();
      if (!code) {
        vscode.window.showWarningMessage(
          'WildAI: Please select some code in the active editor first.'
        );
        return;
      }
      await chatProvider.executeCommandPrompt(
        'Please write comprehensive unit tests covering standard cases, edge cases, and failure scenarios for the following code:',
        code
      );
    }),

    vscode.commands.registerCommand('wildai.fixBugs', async () => {
      const code = getSelectedCode();
      if (!code) {
        vscode.window.showWarningMessage(
          'WildAI: Please select some code in the active editor first.'
        );
        return;
      }
      await chatProvider.executeCommandPrompt(
        'Please analyze the following code for potential bugs, security vulnerabilities, or performance leaks, and provide the corrected code:',
        code
      );
    }),

    vscode.commands.registerCommand('wildai.clearChat', () => {
      chatProvider.clearHistory();
    }),

    vscode.commands.registerCommand('wildai.setApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        title: 'WildAI API Token',
        prompt: 'Enter your WildAI API Token / JWT from https://v2.wildai.pl',
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey !== undefined) {
        await context.secrets.store('wildai.apiToken', apiKey.trim());
        vscode.window.showInformationMessage(
          'WildAI: API token updated successfully.'
        );
      }
    })
  );
}

export function deactivate() {}
