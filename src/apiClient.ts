import { ChatMessage } from './types';

export interface ApiClientOptions {
  apiUrl: string;
  apiToken?: string;
  model: string;
  temperature: number;
}

export class WildAiClient {
  constructor(private options: ApiClientOptions) {}

  public updateOptions(options: Partial<ApiClientOptions>) {
    this.options = { ...this.options, ...options };
  }

  public async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const endpoint = this.options.apiUrl.endsWith('/')
        ? `${this.options.apiUrl}chat/completions`
        : `${this.options.apiUrl}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.options.apiToken) {
        headers['Authorization'] = `Bearer ${this.options.apiToken}`;
      }

      const body = JSON.stringify({
        model: this.options.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.options.temperature,
        stream: true,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `WildAI API Error (${response.status}): ${errorText || response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            onDone();
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const content =
                parsed.choices?.[0]?.delta?.content ??
                parsed.choices?.[0]?.text ??
                parsed.content ??
                '';
              if (content) {
                onChunk(content);
              }
            } catch {
              // Raw text chunk fallback
              onChunk(dataStr);
            }
          }
        }
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
