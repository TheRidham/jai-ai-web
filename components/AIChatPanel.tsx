"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, X, MessageCircle, Sparkles } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";
import { marked } from "marked";

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface AIChatPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AIChatPanel({ isCollapsed, onToggleCollapse }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, isStreaming, sendMessageStream, clearMessages } = useAIChat();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isStreaming) return;
    const msg = input;
    setInput("");
    await sendMessageStream(msg);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed top-4 right-4 z-50 bg-emerald-500 text-white p-3 rounded-full shadow-lg hover:bg-emerald-600 transition-colors"
        title="Open AI Chat"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:top-4 sm:right-4 sm:bottom-4 z-50 w-full sm:w-96 h-[calc(100vh-2rem)] sm:h-[calc(100vh-2rem)] bg-white rounded-none sm:rounded-lg shadow-2xl flex flex-col border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">AI Assistant</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={clearMessages}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Collapse"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium mb-1">AI Assistant</p>
            <p className="text-gray-400 text-sm">Ask me anything during your call</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-4 py-2 max-w-[85%] sm:max-w-[85%] rounded-2xl ${
                msg.role === "user"
                  ? "bg-emerald-500 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200"
              }`}
            >
              <div
                className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(msg.content ?? ""),
                }}
              />
            </div>
          </div>
        ))}

        {/* Loading State */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 border border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask something..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            disabled={isLoading || isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || isStreaming || !input.trim()}
            className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
