class NeuroAssistant {
    constructor() {
        this.apiKey = null;
        this.messages = [];
        this.currentStreamingMessage = null;
        this.userScrolledUp = false;
        this.initializeElements();
        this.bindEvents();
        this.loadTheme();
        this.loadApiKey();
        this.loadChatHistory();
        this.initMarked();
    }

    initializeElements() {
        this.form = document.getElementById('chatForm');
        this.userInput = document.getElementById('userInput');
        this.outputArea = document.getElementById('outputArea');
        this.sendButton = document.getElementById('sendButton');
        this.systemPrompt = document.getElementById('systemPrompt');
        this.buttonText = this.sendButton.querySelector('.button-text');
        this.loadingSpinner = this.sendButton.querySelector('.loading-spinner');
        this.quickActions = document.getElementById('quickActions');
        this.tokenInfo = document.getElementById('tokenInfo');
        this.exportBtn = document.getElementById('exportBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.checkKeyButton = document.getElementById('checkKeyButton');
        this.apiKeyStatus = document.getElementById('apiKeyStatus');
        this.themeToggle = document.getElementById('themeToggle');
    }

    initMarked() {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (prefersDark) {
            this.setTheme('dark');
        } else {
            this.setTheme('light');
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            this.themeToggle.textContent = '☀️ Светлая тема';
        } else {
            this.themeToggle.textContent = '🌙 Темная тема';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    loadChatHistory() {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            this.messages = JSON.parse(savedHistory);
            this.renderChatHistory();
        }
    }

    renderChatHistory() {
        const welcomeMessage = this.outputArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.messages.forEach(msg => {
            this.addMessage(msg.text, msg.type, false);
        });
    }

    saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    }

    clearChat() {
        this.messages = [];
        localStorage.removeItem('chatHistory');
        this.outputArea.innerHTML = `
            <div class="welcome-message">
                <p>👋 Добро пожаловать в Нейропомощник!</p>
                <p>Задайте мне любой вопрос о планировании дня, создании чек-листов или генерации идей.</p>
            </div>
        `;
        this.tokenInfo.textContent = '';
    }

    exportChat() {
        if (this.messages.length === 0) {
            alert('Нет сообщений для экспорта');
            return;
        }

        let content = '# Нейропомощник - История чата\n\n';
        content += `Дата: ${new Date().toLocaleString()}\n\n`;
        content += `Системный промпт: ${this.systemPrompt.value}\n\n---\n\n`;

        this.messages.forEach(msg => {
            const label = msg.type === 'user' ? '## Вы' : '## Нейропомощник';
            content += `${label}\n\n${msg.text}\n\n---\n\n`;
        });

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        this.userInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.userInput.value.trim() || !this.apiKey;
        });

        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.sendButton.disabled) {
                    this.handleSubmit();
                }
            }
        });

        this.exportBtn.addEventListener('click', () => {
            this.exportChat();
        });

        this.clearBtn.addEventListener('click', () => {
            if (confirm('Очистить историю чата?')) {
                this.clearChat();
            }
        });

        this.outputArea.addEventListener('scroll', () => {
            const threshold = 50;
            const position = this.outputArea.scrollHeight - this.outputArea.scrollTop - this.outputArea.clientHeight;
            this.userScrolledUp = position > threshold;
        });

        this.quickActions.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-action-btn')) {
                this.userInput.value = e.target.dataset.prompt;
                this.sendButton.disabled = !this.apiKey;
                this.userInput.focus();
            }
        });

        this.systemPrompt.addEventListener('change', () => {
            localStorage.setItem('systemPrompt', this.systemPrompt.value);
        });

        const savedPrompt = localStorage.getItem('systemPrompt');
        if (savedPrompt) {
            this.systemPrompt.value = savedPrompt;
        }

        this.checkKeyButton.addEventListener('click', () => {
            this.checkApiKey();
        });

        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.checkApiKey();
            }
        });

        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    loadApiKey() {
        this.apiKey = localStorage.getItem('geminiApiKey');
        
        if (this.apiKey) {
            this.apiKeyInput.value = this.apiKey;
            this.showApiKeyStatus('valid', 'API ключ загружен');
        }
        
        this.sendButton.disabled = !this.userInput.value.trim();
    }

    validateApiKeyFormat(key) {
        // Google Gemini API keys typically start with AIza
        const pattern = /^AIza[A-Za-z0-9_-]{35}$/;
        return pattern.test(key);
    }

    async checkApiKey() {
        const key = this.apiKeyInput.value.trim();
        
        if (!key) {
            this.showApiKeyStatus('error', 'Пожалуйста, введите API ключ');
            return;
        }
        
        if (!this.validateApiKeyFormat(key)) {
            this.showApiKeyStatus('error', 'Неверный формат ключа. Ключ должен начинаться с AIza и содержать 39 символов');
            return;
        }
        
        this.showApiKeyStatus('loading', 'Проверка ключа...');
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            
            if (response.ok) {
                this.apiKey = key;
                localStorage.setItem('geminiApiKey', key);
                this.showApiKeyStatus('valid', 'API ключ действителен');
                this.sendButton.disabled = !this.userInput.value.trim();
            } else {
                const errorData = await response.json();
                const errorMsg = errorData.error?.message || 'Ключ недействителен';
                this.showApiKeyStatus('error', `Ошибка: ${errorMsg}`);
            }
        } catch (error) {
            this.showApiKeyStatus('error', 'Ошибка сети. Проверьте подключение к интернету.');
        }
    }

    showApiKeyStatus(status, message) {
        this.apiKeyStatus.textContent = message;
        this.apiKeyStatus.className = 'api-key-status visible ' + status;
    }

    async handleSubmit() {
        const userMessage = this.userInput.value.trim();
        if (!userMessage || !this.apiKey) return;

        const welcomeMessage = this.outputArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.addMessage(userMessage, 'user');
        this.userInput.value = '';
        this.setLoading(true);

        try {
            await this.callGeminiAPIStreaming(userMessage);
        } catch (error) {
            this.showError(`Ошибка: ${error.message}`);
        } finally {
            this.setLoading(false);
            this.currentStreamingMessage = null;
        }
    }

    async callGeminiAPIStreaming(message, retries = 3) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:streamGenerateContent?key=${this.apiKey}`;
        
        const requestBody = {
            systemInstruction: {
                parts: [{ text: this.systemPrompt.value }]
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: message }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                
                if (response.status === 429 && retries > 0) {
                    this.showError('Превышен лимит запросов. Повторная попытка через 2 секунды...');
                    await this.delay(2000);
                    return this.callGeminiAPIStreaming(message, retries - 1);
                }
                
                throw new Error(errorMsg);
            }

            this.currentStreamingMessage = this.createStreamingMessage();
            let fullText = '';
            let totalTokens = 0;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        if (line.startsWith('[') || line.startsWith(',')) {
                            const cleanLine = line.replace(/^,/, '');
                            const data = JSON.parse(cleanLine);
                            
                            if (data.candidates && data.candidates[0]) {
                                const candidate = data.candidates[0];
                                if (candidate.content && candidate.content.parts) {
                                    const text = candidate.content.parts[0].text;
                                    if (text) {
                                        fullText += text;
                                        this.updateStreamingMessage(fullText);
                                    }
                                }
                                
                                if (candidate.usageMetadata) {
                                    totalTokens = candidate.usageMetadata.totalTokenCount || 0;
                                }
                            }
                        }
                    } catch (e) {
                        // Skip malformed JSON
                    }
                }
            }

            this.finalizeStreamingMessage(fullText);
            
            this.messages.push({ text: message, type: 'user' });
            this.messages.push({ text: fullText, type: 'assistant' });
            this.saveChatHistory();

            if (totalTokens > 0) {
                this.tokenInfo.textContent = `Токенов использовано: ${totalTokens}`;
            }

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Ошибка сети. Проверьте подключение к интернету.');
            }
            throw error;
        }
    }

    createStreamingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant streaming';
        messageDiv.innerHTML = `
            <strong>Нейропомощник:</strong>
            <div class="message-content"><p></p></div>
            <button class="copy-btn" title="Копировать ответ">📋</button>
        `;
        
        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const content = messageDiv.querySelector('.message-content').textContent;
            this.copyToClipboard(content, copyBtn);
        });
        
        this.outputArea.appendChild(messageDiv);
        this.scrollToBottom();
        return messageDiv;
    }

    updateStreamingMessage(text) {
        if (!this.currentStreamingMessage) return;
        
        const contentDiv = this.currentStreamingMessage.querySelector('.message-content');
        if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(text);
        } else {
            contentDiv.innerHTML = this.formatMessage(text);
        }
        
        if (!this.userScrolledUp) {
            this.scrollToBottom();
        }
    }

    finalizeStreamingMessage(text) {
        if (!this.currentStreamingMessage) return;
        this.currentStreamingMessage.classList.remove('streaming');
        
        const contentDiv = this.currentStreamingMessage.querySelector('.message-content');
        if (typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(text);
        } else {
            contentDiv.innerHTML = this.formatMessage(text);
        }
    }

    scrollToBottom() {
        this.outputArea.scrollTop = this.outputArea.scrollHeight;
    }

    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            button.textContent = '✅';
            setTimeout(() => {
                button.textContent = '📋';
            }, 2000);
        }).catch(() => {
            button.textContent = '❌';
            setTimeout(() => {
                button.textContent = '📋';
            }, 2000);
        });
    }

    addMessage(text, type, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const label = type === 'user' ? 'Вы' : 'Нейропомощник';
        const content = typeof marked !== 'undefined' && type === 'assistant' 
            ? marked.parse(text) 
            : this.formatMessage(text);
        
        if (type === 'assistant') {
            messageDiv.innerHTML = `
                <strong>${label}:</strong>
                <div class="message-content">${content}</div>
                <button class="copy-btn" title="Копировать ответ">📋</button>
            `;
            
            const copyBtn = messageDiv.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                this.copyToClipboard(text, copyBtn);
            });
        } else {
            messageDiv.innerHTML = `<strong>${label}:</strong><div class="message-content">${content}</div>`;
        }
        
        this.outputArea.appendChild(messageDiv);
        
        if (!this.userScrolledUp) {
            this.scrollToBottom();
        }
        
        if (save) {
            this.messages.push({ text, type });
            this.saveChatHistory();
        }
    }

    formatMessage(text) {
        return text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<strong>Ошибка:</strong> ${message}`;
        
        this.outputArea.appendChild(errorDiv);
        this.scrollToBottom();
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    setLoading(isLoading) {
        this.sendButton.disabled = isLoading || !this.userInput.value.trim();
        if (isLoading) {
            this.buttonText.style.display = 'none';
            this.loadingSpinner.style.display = 'inline-block';
        } else {
            this.buttonText.style.display = 'inline-block';
            this.loadingSpinner.style.display = 'none';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.resetApiKey = function() {
    if (confirm('Вы уверены, что хотите сбросить API ключ?')) {
        localStorage.removeItem('geminiApiKey');
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    new NeuroAssistant();
});
