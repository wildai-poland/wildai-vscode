import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChatMessage } from './types';

export interface ApiClientOptions {
  apiUrl: string;
  apiToken?: string;
  model: string;
  temperature: number;
}

export class WildAiClient {
  private activeChatId?: string;

  constructor(private options: ApiClientOptions) {}

  public updateOptions(options: Partial<ApiClientOptions>) {
    this.options = { ...this.options, ...options };
  }

  // Automatyczne wykrywanie tokenu z konfiguracji CLI (~/.wildai-cli/config.json)
  private getFallbackToken(): string | undefined {
    try {
      const cliConfigPath = path.join(os.homedir(), '.wildai-cli', 'config.json');
      if (fs.existsSync(cliConfigPath)) {
        const raw = fs.readFileSync(cliConfigPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.accessToken && !parsed.accessToken.startsWith('enc:') && !parsed.accessToken.startsWith('keychain:')) {
          return parsed.accessToken;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  public async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const endpoint = this.options.apiUrl.trim() || 'https://chat.wildai.pl/api/chat';
      const token = this.options.apiToken || this.getFallbackToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = JSON.stringify({
        model: this.options.model || 'deepseek-v4.1-flash-uncensored',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        chatId: this.activeChatId,
        max_tokens: 4096,
        temperature: this.options.temperature,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = errorText;
        try {
          const parsed = JSON.parse(errorText);
          errMsg = parsed.error || errorText;
        } catch {}
        throw new Error(`WildAI API Error (${response.status}): ${errMsg}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        // Jeśli pierwsza linia zawiera {"chatId": ...}, wyciągamy chatId i nie wyświetlamy JSON-a
        if (isFirstChunk && buffer.includes('\n')) {
          const lines = buffer.split('\n');
          const firstLine = lines[0].trim();
          if (firstLine.startsWith('{') && firstLine.includes('chatId')) {
            try {
              const meta = JSON.parse(firstLine);
              if (meta.chatId) {
                this.activeChatId = meta.chatId;
              }
              buffer = lines.slice(1).join('\n');
            } catch {
              // Not JSON, keep buffer
            }
          }
          isFirstChunk = false;
        }

        if (buffer) {
          onChunk(buffer);
          buffer = '';
        }
      }

      if (buffer) {
        onChunk(buffer);
      }

      onDone();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onDone();
      } else {
        onError(err);
      }
    }
  }
}
