"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Github,
  Twitter,
} from "lucide-react";
import StateProvisionsDiscovery from "./StateProvisionsDiscovery";

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
  const [isInputFocused, setIsInputFocused] = useState(false);
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
    setIsInputFocused(false); // Collapse textarea after sending

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

  // Handle input focus/blur for dynamic sizing
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
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

  // Handle starting a new chat from state provisions
  const handleStartChatFromProvision = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen bg-peach">
      {/* Header with accessible styling */}
      <div className="bg-black shadow-lg">
        <div
          className="border-b px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#FFF3DC" }}
        >
          <div className="flex items-center">
            <div
              className="hidden sm:flex flex-shrink-0"
              style={{ marginRight: "24px" }}
            >
              <img
                src="/images/header-image-hr1.png"
                alt="HR1 One Big Beautiful Bill"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">
                <span className="sm:hidden">OB3.chat</span>
                <span className="hidden sm:inline">
                  OB3.chat - One Big Beautiful Bill Act Chat assistant
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={clearChat}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages with accessible styling */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="w-full max-w-7xl mx-auto p-6">
            {/* Three Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {/* Column 1: Image (Hidden on Mobile) */}
              <div className="hidden lg:flex flex-col">
                <div className="bg-yellow-light border border-yellow rounded-lg p-6 h-full flex flex-col items-center justify-center">
                  <div className="w-full max-w-[240px] rounded-lg overflow-hidden border-4 border-red-600">
                    <img
                      src="/images/initial-landing-image-small.png"
                      alt="One Big Beautiful Bill - HR1 2025"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Chat Description (Full width on mobile) */}
              <div className="flex flex-col lg:col-span-1">
                <div className="bg-yellow-light border border-yellow rounded-lg p-6 h-full flex flex-col">
                  <h2 className="text-xl font-bold text-black mb-3">
                    Explore H.R. 2025 via Chat
                  </h2>
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed flex-grow">
                    Ask questions about the 2025 "One Big Beautiful Bill Act" -
                    explore tax relief, border security, energy policy,
                    healthcare reforms, and more with AI-powered analysis. Chat
                    as you would with ChatGPT or Claude—this is similar
                    interface, but focused on the One Big Beautiful Bill Act.
                  </p>
                  <div className="bg-white rounded-lg p-4 shadow-sm mt-auto">
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-start space-x-2">
                        <span>•</span>
                        <p>"What does HR1 say about tax relief?"</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span>•</span>
                        <p>"How does HR1 address border security?"</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span>•</span>
                        <p>"What are the energy provisions in HR1?"</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span>•</span>
                        <p>"Are there any clauses about AI regulation?"</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span>•</span>
                        <p>"How about subsidies for farmers ?"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: State Discovery */}
              <div className="flex flex-col lg:col-span-1">
                <StateProvisionsDiscovery
                  onStartChat={handleStartChatFromProvision}
                />
              </div>
            </div>
          </div>
        )}

        <div className="max-w-none lg:max-w-6xl lg:mx-auto">
          {messages.map((message, index) => (
            <div key={index} className="flex justify-start mb-4">
              <div
                className={`w-full ${
                  message.role === "user"
                    ? "user-message text-black font-semibold rounded-xl px-8 py-6 mx-4"
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
                          <img
                            src="/images/loading-icon.png"
                            alt="Loading..."
                            className="h-6 w-6 animate-spin"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="text-gray-700 font-medium">
                            Searching HR1 bill and generating response
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600 text-sm">
                              Processing
                            </span>
                            <div className="flex space-x-1">
                              <div
                                className="w-1 h-1 bg-gray-600 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-1 h-1 bg-gray-600 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-1 h-1 bg-gray-600 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                          </div>
                        </div>
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
                            userQuestion={
                              messages[index - 1]?.role === "user"
                                ? messages[index - 1].content
                                : ""
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Copy Button - only for AI responses */}
                  {!message.processing &&
                    !message.error &&
                    message.role === "assistant" && (
                      <button
                        onClick={() => {
                          // Find the corresponding user message (previous message)
                          const userMessage = messages[index - 1];
                          const userPrompt =
                            userMessage && userMessage.role === "user"
                              ? `Question: ${userMessage.content}\n\n`
                              : "";
                          const fullContent = `${userPrompt}${message.content}`;
                          copyToClipboard(fullContent, `${index}`);
                        }}
                        className="ml-3 p-2 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100"
                        title="Copy question and answer"
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
                    message.role === "user"
                      ? "text-yellow-800"
                      : "text-gray-600"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with accessible styling */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex space-x-4 items-start">
          <div className="flex-1 mr-2">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Ask a question about HR1... (Press Enter to send, Shift+Enter for new line)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:border-yellow bg-white text-sm text-black transition-all duration-200"
                rows={isInputFocused ? 3 : 1}
                style={{
                  minHeight: isInputFocused ? "120px" : "40px",
                  maxHeight: isInputFocused ? "120px" : "40px",
                  resize: "none",
                }}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-2 top-2">
                  <img
                    src="/images/loading-icon.png"
                    alt="Loading..."
                    className="h-4 w-4 animate-spin"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-2 flex flex-col items-end">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || input.length > 1000}
              className="bg-black text-white px-5 py-2 rounded-lg hover:bg-yellow hover:text-black focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium h-10"
            >
              {isLoading ? (
                <img
                  src="/images/loading-icon.png"
                  alt="Loading..."
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Send</span>
            </button>
            <div className="flex items-center justify-end mt-1">
              <span className="text-xs text-gray-600">{input.length}/1000</span>
              {input.length > 1000 && (
                <span className="text-xs text-red-600 ml-2">Too long!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
          <span>
            Built by{" "}
            <a
              href="https://www.a-ok.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-medium hover:underline"
            >
              The A-OK Collective
            </a>
          </span>
          <div className="flex items-center space-x-3">
            <a
              href="https://github.com/lucasdickey/obbb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors"
              title="View on GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/apesonkeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors"
              title="@apesonkeys on X"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/lucasdickey4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors"
              title="@04 on X"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// New component for structured AI responses
function AIResponse({
  content,
  sources,
  userQuestion,
}: {
  content: string;
  sources?: CitationSource[];
  userQuestion?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    new Set()
  );
  const [showSources, setShowSources] = useState(false);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const toggleSourceExpanded = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  // Parse the response into bullet points and prose
  const lines = content.split("\n").filter((line) => line.trim());

  // Check for emoji bullet points (lines that start with an emoji)
  // Simple check for common emojis used in the examples
  const isEmojiLine = (line: string) => {
    const trimmed = line.trim();
    const firstChar = trimmed.charAt(0);
    // Check if first character is likely an emoji (high Unicode range)
    return (
      firstChar &&
      firstChar.charCodeAt(0) > 127 &&
      !trimmed.startsWith("•") &&
      !trimmed.startsWith("-")
    );
  };

  const bulletPoints = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("•") || trimmed.startsWith("-") || isEmojiLine(line)
    );
  });

  const proseContent = lines
    .filter((line) => {
      const trimmed = line.trim();
      return (
        !trimmed.startsWith("•") &&
        !trimmed.startsWith("-") &&
        !isEmojiLine(line)
      );
    })
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
          <ul className="space-y-3 text-sm text-gray-800">
            {bulletPoints.map((point, index) => {
              const trimmed = point.trim();
              const isEmoji = isEmojiLine(point);
              const cleanPoint = isEmoji
                ? trimmed
                : trimmed.replace(/^[•-]\s*/, "");

              return (
                <li key={index} className="flex items-start space-x-3">
                  {!isEmoji && (
                    <span className="text-black font-bold text-sm flex-shrink-0 mt-0.5 w-4">
                      {index + 1}.
                    </span>
                  )}
                  <span className="leading-relaxed">{cleanPoint}</span>
                </li>
              );
            })}
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
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors mb-3"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow rounded-full"></div>
              <span className="font-semibold text-black">
                Sources from HR1 Bill
              </span>
              <div className="bg-gray-300 text-gray-700 px-2 py-1 rounded-lg text-xs font-medium">
                {sources.length}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <span className="text-xs font-medium">
                {showSources ? "Hide" : "Show"}
              </span>
              {showSources ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {showSources && (
            <div className="space-y-3">
              {sources.map((source, sourceIndex) => {
                const isExpanded = expandedSources.has(source.id);
                const truncatedText = source.text.substring(0, 600);
                const needsTruncation = source.text.length > 600;
                const displayText = isExpanded ? source.text : truncatedText;

                return (
                  <div
                    key={source.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
                            {sourceIndex + 1}
                          </span>
                        </div>
                        <span className="font-semibold text-black">
                          {source.section || "HR1 Bill"}
                        </span>
                        <div
                          className="bg-yellow text-black px-3 py-1 rounded-lg text-xs font-medium cursor-help whitespace-nowrap"
                          title="Relevancy Match % - how well this text matches your question"
                        >
                          {Math.round(source.score * 100)}%
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const questionPart = userQuestion
                            ? `Question: ${userQuestion}\n\n`
                            : "";
                          const bulletSummary = bulletPoints.join("\n");
                          const fullText = `${questionPart}${bulletSummary}\n\nSource: ${source.text}`;
                          copyToClipboard(fullText, `source-${source.id}`);
                        }}
                        className="text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg p-1"
                        title="Copy question, summary + source text"
                      >
                        {copied === `source-${source.id}` ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {displayText}
                      {needsTruncation && !isExpanded && (
                        <>
                          ...{" "}
                          <button
                            onClick={() => toggleSourceExpanded(source.id)}
                            className="inline-flex items-center text-gray-600 hover:text-black hover:bg-gray-100 rounded p-1 ml-1"
                            title="Show more"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      {needsTruncation && isExpanded && (
                        <>
                          {" "}
                          <button
                            onClick={() => toggleSourceExpanded(source.id)}
                            className="inline-flex items-center text-gray-600 hover:text-black hover:bg-gray-100 rounded p-1 ml-1"
                            title="Show less"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
