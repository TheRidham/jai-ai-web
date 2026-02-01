import { useState, useCallback, useRef } from 'react';
import { streamChatSSE } from '@/lib/streamChatSSE';
import { EXPERT_AI_SYSTEM_PROMPT } from '@/lib/prompts';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  _isStreaming?: boolean;
  _streamingId?: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessageStream = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    const requestId = ++lastRequestIdRef.current;
    const streamingId = `streaming-${Date.now()}`;
    let streamingMessageAdded = false;

    // Abort any previous streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      // Format messages for the API
      const formattedMessages = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user', content }
      ];

      await streamChatSSE(
        formattedMessages,
        EXPERT_AI_SYSTEM_PROMPT,
        {
          onChunk: (chunk) => {
            // Check if this is still the latest request
            if (requestId !== lastRequestIdRef.current) {
              return;
            }

            setIsLoading(false);

            // Add streaming message on first chunk
            if (!streamingMessageAdded) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: chunk.fullResponse,
                  _isStreaming: true,
                  _streamingId: streamingId
                }
              ]);
              streamingMessageAdded = true;
            } else {
              // Update existing streaming message
              setMessages((prev) =>
                prev.map((msg) =>
                  msg._streamingId === streamingId
                    ? { ...msg, content: chunk.fullResponse }
                    : msg
                )
              );
            }
          },
          onComplete: (fullResponse) => {
            // Check if this is still the latest request
            if (requestId !== lastRequestIdRef.current) {
              return;
            }

            // Remove streaming flag
            setMessages((prev) =>
              prev.map((msg) =>
                msg._streamingId === streamingId
                  ? { ...msg, content: fullResponse, _isStreaming: false }
                  : msg
              )
            );

            setIsStreaming(false);
            setIsLoading(false);
          },
          onError: (error) => {
            // Check if this is still the latest request
            if (requestId !== lastRequestIdRef.current) {
              return;
            }

            console.error('useAIChat: Streaming error:', error);
            // Remove streaming message if it was added
            setMessages((prev) => prev.filter(msg => msg._streamingId !== streamingId));
            setIsStreaming(false);
            setError(error.error || 'Streaming failed');
          }
        }
      );
    } catch (err: any) {
      if (requestId !== lastRequestIdRef.current) return;

      console.error('useAIChat: Error:', err);
      // Remove streaming message if it was added
      setMessages((prev) => prev.filter(msg => msg._streamingId !== streamingId));
      setIsStreaming(false);
      setError(err.message || 'Failed to stream response');
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    lastRequestIdRef.current += 1;
    setIsLoading(false);
    setIsStreaming(false);
    setError(null);
    // Abort any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessageStream,
    clearMessages,
  };
};
