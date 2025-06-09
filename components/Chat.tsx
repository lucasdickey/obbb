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
    <div className="flex flex-col h-screen bg-peach">
      {/* Header with accessible styling */}
      <div className="bg-black shadow-lg">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-black">HR1 Q&A Assistant</h1>
            <p className="text-xs text-gray-600 font-medium">
              Ask questions about the "One Big Beautiful Bill Act"
            </p>
          </div>
          <button
            onClick={clearChat}
            className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
            disabled={messages.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages with accessible styling */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="bg-yellow-light border border-yellow rounded-lg p-4 mx-auto max-w-md">
              <div className="bg-yellow rounded-full p-2 w-12 h-12 mx-auto mb-4">
                <Info className="h-8 w-8 text-black mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-black mb-2">
                Welcome to HR1 Q&A
              </h3>
              <p className="text-gray-700 mb-4 text-sm">
                Ask me anything about the HR1 "One Big Beautiful Bill Act" - tax
                relief, border security, energy policy, healthcare, and more.
              </p>
              <div className="text-xs text-gray-600 space-y-1 bg-white rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow rounded-full"></div>
                  <p>"What does HR1 say about tax relief?"</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow rounded-full"></div>
                  <p>"How does HR1 address border security?"</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow rounded-full"></div>
                  <p>"What are the energy provisions in HR1?"</p>
                </div>
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
              className={`max-w-2xl w-full ${
                message.role === "user"
                  ? "user-message text-black font-semibold rounded-xl px-6 py-4"
                  : message.error
                    ? "bg-white border border-red-600 shadow-md"
                    : "bg-white border border-gray-200 shadow-md"
              } rounded-lg px-4 py-3`}
            >
              {/* Message Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {message.processing ? (
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow rounded-full p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                      </div>
                      <span className="text-gray-700 font-medium">
                        {message.content}
                      </span>
                    </div>
                  ) : message.error ? (
                    <div className="flex items-center space-x-3">
                      <div className="bg-red-600 rounded-full p-2">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-red-600 font-medium">
                        {message.content}
                      </span>
                    </div>
                  ) : (
                    <div>
                      {message.role === "user" ? (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                      ) : (
                        <AIResponse
                          content={message.content}
                          sources={message.sources}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Copy Button */}
                {!message.processing && !message.error && (
                  <button
                    onClick={() => copyToClipboard(message.content, `${index}`)}
                    className={`ml-3 p-2 rounded-lg ${
                      message.role === "user"
                        ? "text-yellow-800 hover:text-black hover:bg-yellow"
                        : "text-gray-600 hover:text-black hover:bg-gray-100"
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

              {/* Timestamp */}
              <div
                className={`text-xs mt-3 font-medium ${
                  message.role === "user" ? "text-yellow-800" : "text-gray-600"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with accessible styling */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about HR1... (Press Enter to send, Shift+Enter for new line)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:border-yellow bg-white text-sm text-black"
                rows={1}
                style={{
                  minHeight: "40px",
                  maxHeight: "80px",
                  resize: "none",
                }}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-2 top-2">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-800" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-600">
                {input.length}/1000 characters
              </span>
              {input.length > 1000 && (
                <span className="text-xs text-red-600">
                  Too long! Please shorten your question.
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || input.length > 1000}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-yellow hover:text-black focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium"
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

// New component for structured AI responses
function AIResponse({
  content,
  sources,
}: {
  content: string;
  sources?: CitationSource[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Parse the response into bullet points and prose
  const lines = content.split("\n").filter((line) => line.trim());
  const bulletPoints = lines.filter(
    (line) => line.trim().startsWith("•") || line.trim().startsWith("-")
  );
  const proseContent = lines
    .filter(
      (line) => !line.trim().startsWith("•") && !line.trim().startsWith("-")
    )
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Bullet Summary */}
      {bulletPoints.length > 0 && (
        <div>
          <h4 className="font-semibold text-black mb-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow rounded-full"></div>
            <span>Key Points</span>
          </h4>
          <ul className="space-y-1 text-sm text-gray-800">
            {bulletPoints.map((point, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-gray-600 rounded-full mt-2 flex-shrink-0"></div>
                <span>{point.replace(/^[•-]\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prose Summary */}
      {proseContent && (
        <div>
          <h4 className="font-semibold text-black mb-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow rounded-full"></div>
            <span>Summary</span>
          </h4>
          <p className="text-sm text-gray-800 leading-relaxed">
            {proseContent}
          </p>
        </div>
      )}

      {/* Citations */}
      {sources && sources.length > 0 && (
        <div>
          <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow rounded-full"></div>
            <span>Sources from HR1 Bill</span>
          </h4>
          <div className="space-y-3">
            {sources.map((source, sourceIndex) => (
              <div
                key={source.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-black flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow rounded-full flex items-center justify-center">
                      <span className="text-black text-xs font-bold">
                        {sourceIndex + 1}
                      </span>
                    </div>
                    <span>{source.section || "HR1 Bill"}</span>
                  </span>
                  <div className="bg-yellow text-black px-2 py-1 rounded-full text-xs font-medium">
                    {Math.round(source.score * 100)}% relevance
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  {source.text.substring(0, 200)}...
                </p>
                <button
                  onClick={() => {
                    const bulletSummary = bulletPoints.join("\n");
                    const fullText = `${bulletSummary}\n\nSource: ${source.text}`;
                    copyToClipboard(fullText, `source-${source.id}`);
                  }}
                  className="text-xs font-medium text-black hover:text-yellow-800 flex items-center space-x-1 hover:bg-yellow rounded-lg px-2 py-1"
                >
                  {copied === `source-${source.id}` ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>Copy summary + full text</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
