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
    <div className="flex flex-col h-screen bg-blue-50">
      {/* Header with simple styling */}
      <div className="bg-blue-600 shadow-lg">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              HR1 Q&A Assistant
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              Ask questions about the "One Big Beautiful Bill Act"
            </p>
          </div>
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
            disabled={messages.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages with simple styling */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-8 mx-auto max-w-lg">
              <div className="bg-blue-500 rounded-full p-3 w-16 h-16 mx-auto mb-6">
                <Info className="h-10 w-10 text-white mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                Welcome to HR1 Q&A
              </h3>
              <p className="text-gray-600 mb-6">
                Ask me anything about the HR1 "One Big Beautiful Bill Act" - tax
                relief, border security, energy policy, healthcare, and more.
              </p>
              <div className="text-sm text-gray-500 space-y-2 bg-white rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p>"What does HR1 say about tax relief?"</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <p>"How does HR1 address border security?"</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <p>"What are the energy provisions in HR1?"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} transition-all duration-300 ease-out`}
          >
            <div
              className={`max-w-4xl w-full transform transition-all duration-300 hover:scale-[1.01] ${
                message.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl"
                  : message.error
                    ? "bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 shadow-lg"
                    : "bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg hover:shadow-xl"
              } rounded-2xl px-6 py-4`}
            >
              {/* Message Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {message.processing ? (
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                      <span className="text-slate-700 font-medium">
                        {message.content}
                      </span>
                    </div>
                  ) : message.error ? (
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-red-400 to-pink-500 rounded-full p-2">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-red-700 font-medium">
                        {message.content}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`whitespace-pre-wrap leading-relaxed ${
                        message.role === "user"
                          ? "text-white font-medium"
                          : "text-slate-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  )}
                </div>

                {/* Enhanced Copy Button */}
                {!message.processing && !message.error && (
                  <button
                    onClick={() => copyToClipboard(message.content, `${index}`)}
                    className={`ml-3 p-2 rounded-lg transition-all duration-200 ${
                      message.role === "user"
                        ? "text-blue-100 hover:text-white hover:bg-white/20"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                    title="Copy message"
                  >
                    {copied === `${index}` ? (
                      <CheckCircle className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Enhanced Citations */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                    <span>Sources from HR1 Bill</span>
                  </h4>
                  <div className="grid gap-3">
                    {message.sources.map((source, sourceIndex) => (
                      <div
                        key={source.id}
                        className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 text-sm hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-700 flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {sourceIndex + 1}
                              </span>
                            </div>
                            <span>{source.section || "HR1 Bill"}</span>
                          </span>
                          <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {Math.round(source.score * 100)}% relevance
                          </div>
                        </div>
                        <p className="text-slate-600 line-clamp-3 leading-relaxed">
                          {source.text.substring(0, 200)}...
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(source.text, `source-${source.id}`)
                          }
                          className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1 hover:bg-blue-50 rounded-lg px-2 py-1 transition-all duration-200"
                        >
                          {copied === `source-${source.id}` ? (
                            <CheckCircle className="h-3 w-3 animate-pulse" />
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

              {/* Enhanced Timestamp */}
              <div
                className={`text-xs mt-3 font-medium ${
                  message.role === "user" ? "text-blue-100" : "text-slate-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Form */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200 shadow-lg px-6 py-6">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about HR1... (Press Enter to send, Shift+Enter for new line)"
                className="w-full resize-none rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                rows={1}
                style={{
                  minHeight: "48px",
                  maxHeight: "120px",
                  resize: "none",
                }}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500 font-medium">
                {input.length}/1000 characters
              </span>
              {input.length > 1000 && (
                <span className="text-xs text-red-500 font-medium animate-pulse">
                  Too long! Please shorten your question.
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || input.length > 1000}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
