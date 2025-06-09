"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: CitationSource[];
  timestamp: Date;
  processing?: boolean;
  error?: boolean;
}

interface CitationSource {
  id: string;
  text: string;
  section?: string;
  chunkIndex: number;
  score: number;
}

interface ChatResponse {
  response: string;
  sources: CitationSource[];
  processingTime: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const processingMessage: ChatMessage = {
      role: "assistant",
      content: "Searching HR1 bill and generating response...",
      timestamp: new Date(),
      processing: true,
    };

    setMessages((prev) => [...prev, userMessage, processingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data: ChatResponse = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        timestamp: new Date(),
        error: true,
      };

      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(messageId);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            HR1 Q&A Assistant
          </h1>
          <p className="text-sm text-gray-500">
            Ask questions about the "One Big Beautiful Bill Act"
          </p>
        </div>
        <button
          onClick={clearChat}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-blue-50 rounded-lg p-6 mx-auto max-w-md">
              <Info className="h-8 w-8 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to HR1 Q&A
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Ask me anything about the HR1 "One Big Beautiful Bill Act" - tax
                relief, border security, energy policy, healthcare, and more.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• "What does HR1 say about tax relief?"</p>
                <p>• "How does HR1 address border security?"</p>
                <p>• "What are the energy provisions in HR1?"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl w-full ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.error
                    ? "bg-red-50 border border-red-200"
                    : "bg-white border border-gray-200"
              } rounded-lg px-4 py-3 shadow-sm`}
            >
              {/* Message Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {message.processing ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-gray-600">{message.content}</span>
                    </div>
                  ) : message.error ? (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700">{message.content}</span>
                    </div>
                  ) : (
                    <div
                      className={`whitespace-pre-wrap ${message.role === "user" ? "text-white" : "text-gray-900"}`}
                    >
                      {message.content}
                    </div>
                  )}
                </div>

                {/* Copy Button */}
                {!message.processing && !message.error && (
                  <button
                    onClick={() => copyToClipboard(message.content, `${index}`)}
                    className={`ml-2 p-1 rounded hover:bg-gray-100 ${
                      message.role === "user"
                        ? "text-blue-200 hover:text-blue-100"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title="Copy message"
                  >
                    {copied === `${index}` ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Citations */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Sources from HR1 Bill:
                  </h4>
                  <div className="space-y-2">
                    {message.sources.map((source, sourceIndex) => (
                      <div
                        key={source.id}
                        className="bg-gray-50 rounded p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">
                            [{sourceIndex + 1}] {source.section || "HR1 Bill"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(source.score * 100)}% relevance
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-3">
                          {source.text.substring(0, 200)}...
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(source.text, `source-${source.id}`)
                          }
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          {copied === `source-${source.id}` ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>Copy full text</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div
                className={`text-xs mt-2 ${message.role === "user" ? "text-blue-200" : "text-gray-500"}`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about HR1... (Press Enter to send, Shift+Enter for new line)"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: "42px",
                maxHeight: "120px",
                resize: "none",
              }}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {input.length}/1000 characters
              </span>
              {input.length > 1000 && (
                <span className="text-xs text-red-500">
                  Too long! Please shorten your question.
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || input.length > 1000}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
