export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface StreamEvent {
  chunk?: string;
  done?: boolean;
  error?: string;
}

export interface WebviewMessage {
  type: 'sendMessage' | 'insertCode' | 'copyCode' | 'clearHistory' | 'openSettings';
  text?: string;
  code?: string;
}
