import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NeuroAssistant } from '../script.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock;

// Mock DOM environment
document.body.innerHTML = `
  <form id="chatForm">
    <input id="userInput" />
    <button id="sendButton">
      <span class="button-text">Отправить</span>
      <span class="loading-spinner"></span>
    </button>
  </form>
  <div id="outputArea"></div>
  <textarea id="systemPrompt"></textarea>
  <div id="quickActions"></div>
  <div id="tokenInfo"></div>
  <button id="exportBtn"></button>
  <button id="clearBtn"></button>
`;

describe('NeuroAssistant', () => {
  let assistant;

  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    // Reset DOM
    document.body.innerHTML = `
      <form id="chatForm">
        <input id="userInput" />
        <button id="sendButton">
          <span class="button-text">Отправить</span>
          <span class="loading-spinner"></span>
        </button>
      </form>
      <div id="outputArea"></div>
      <textarea id="systemPrompt"></textarea>
      <div id="quickActions"></div>
      <div id="tokenInfo"></div>
      <button id="exportBtn"></button>
      <button id="clearBtn"></button>
    `;
  });

  describe('formatMessage', () => {
    it('should format simple text with line breaks', () => {
      assistant = new NeuroAssistant();
      const input = 'Hello\nWorld';
      const result = assistant.formatMessage(input);
      expect(result).toContain('<p>Hello<br>World</p>');
    });

    it('should format text with double line breaks as paragraphs', () => {
      assistant = new NeuroAssistant();
      const input = 'First paragraph\n\nSecond paragraph';
      const result = assistant.formatMessage(input);
      expect(result).toContain('<p>First paragraph</p><p>Second paragraph</p>');
    });

    it('should handle empty string', () => {
      assistant = new NeuroAssistant();
      const input = '';
      const result = assistant.formatMessage(input);
      expect(result).toContain('<p></p>');
    });

    it('should handle single line', () => {
      assistant = new NeuroAssistant();
      const input = 'Single line';
      const result = assistant.formatMessage(input);
      expect(result).toContain('<p>Single line</p>');
    });
  });

  describe('saveChatHistory', () => {
    it('should save messages to localStorage', () => {
      assistant = new NeuroAssistant();
      assistant.messages = [
        { text: 'Hello', type: 'user' },
        { text: 'Hi there', type: 'assistant' }
      ];
      
      assistant.saveChatHistory();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chatHistory',
        JSON.stringify(assistant.messages)
      );
    });

    it('should save empty messages array', () => {
      assistant = new NeuroAssistant();
      assistant.messages = [];
      
      assistant.saveChatHistory();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chatHistory',
        JSON.stringify([])
      );
    });
  });

  describe('loadChatHistory', () => {
    it('should load messages from localStorage', () => {
      const savedMessages = [
        { text: 'Hello', type: 'user' },
        { text: 'Hi there', type: 'assistant' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedMessages));
      
      assistant = new NeuroAssistant();
      
      expect(assistant.messages).toEqual(savedMessages);
    });

    it('should handle empty localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      assistant = new NeuroAssistant();
      
      expect(assistant.messages).toEqual([]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('chatHistory');
    });
  });

  describe('exportChat', () => {
    it('should alert when no messages to export', () => {
      assistant = new NeuroAssistant();
      assistant.messages = [];
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      assistant.exportChat();
      
      expect(alertSpy).toHaveBeenCalledWith('Нет сообщений для экспорта');
      alertSpy.mockRestore();
    });

    it('should not throw error when messages exist', () => {
      assistant = new NeuroAssistant();
      assistant.messages = [
        { text: 'Hello', type: 'user' },
        { text: 'Hi there', type: 'assistant' }
      ];
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document.createElement and appendChild/removeChild
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      
      expect(() => assistant.exportChat()).not.toThrow();
    });
  });
});
