const vscode = acquireVsCodeApi();
const messagesEl = document.getElementById('messages');
const emptyStateEl = document.getElementById('empty-state');
const inputEl = document.getElementById('prompt-input');
const sendBtn = document.getElementById('btn-send');
const clearBtn = document.getElementById('btn-clear');
const settingsBtn = document.getElementById('btn-settings');

let currentStreamDiv = null;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMarkdown(text) {
  // Triple backtick code blocks
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let formatted = text.replace(codeBlockRegex, (match, lang, code) => {
    const cleanCode = escapeHtml(code.trim());
    const rawCode = encodeURIComponent(code.trim());
    return (
      '<div class="code-block-container">' +
      '<div class="code-header">' +
      '<button class="code-action-btn" onclick="copySnippet(\'' +
      rawCode +
      '\')">Copy</button>' +
      '<button class="code-action-btn" onclick="insertSnippet(\'' +
      rawCode +
      '\')">Insert into Editor</button>' +
      '</div>' +
      '<pre><code>' +
      cleanCode +
      '</code></pre>' +
      '</div>'
    );
  });

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Linebreaks
  formatted = formatted.replace(/\n/g, '<br/>');
  return formatted;
}

window.copySnippet = function (encoded) {
  const code = decodeURIComponent(encoded);
  navigator.clipboard.writeText(code);
};

window.insertSnippet = function (encoded) {
  const code = decodeURIComponent(encoded);
  vscode.postMessage({ type: 'insertCode', code: code });
};

function appendMessage(role, content) {
  if (emptyStateEl) emptyStateEl.style.display = 'none';
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message ' + role;
  msgDiv.innerHTML = formatMarkdown(content);
  messagesEl.appendChild(msgDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msgDiv;
}

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  sendBtn.disabled = true;
  vscode.postMessage({ type: 'sendMessage', text: text });
}

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearBtn.addEventListener('click', () => {
  vscode.postMessage({ type: 'clearHistory' });
});

settingsBtn.addEventListener('click', () => {
  vscode.postMessage({ type: 'openSettings' });
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    inputEl.value = chip.getAttribute('data-cmd') + ' ' + inputEl.value;
    inputEl.focus();
  });
});

window.addEventListener('message', (event) => {
  const data = event.data;
  switch (data.type) {
    case 'addMessage':
      appendMessage(data.message.role, data.message.content);
      break;
    case 'startStream':
      currentStreamDiv = appendMessage('assistant', '');
      break;
    case 'streamChunk':
      if (currentStreamDiv) {
        currentStreamDiv.dataset.raw =
          (currentStreamDiv.dataset.raw || '') + data.chunk;
        currentStreamDiv.innerHTML = formatMarkdown(
          currentStreamDiv.dataset.raw
        );
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      break;
    case 'endStream':
      sendBtn.disabled = false;
      if (currentStreamDiv && data.fullContent) {
        currentStreamDiv.innerHTML = formatMarkdown(data.fullContent);
      }
      currentStreamDiv = null;
      break;
    case 'streamError':
      sendBtn.disabled = false;
      appendMessage('assistant', '⚠️ **Error:** ' + data.error);
      currentStreamDiv = null;
      break;
    case 'clear':
      messagesEl.innerHTML = '';
      if (emptyStateEl) {
        messagesEl.appendChild(emptyStateEl);
        emptyStateEl.style.display = 'flex';
      }
      sendBtn.disabled = false;
      break;
  }
});
