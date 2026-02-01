import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streaming chat endpoint - proxies to Firebase streamChatSSE function
 * Handles CORS by being same-origin, then forwards to Firebase server-to-server
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, systemPrompt } = body;

    console.log('[AI CHAT API] Received payload:', { messagesCount: messages?.length, hasSystemPrompt: !!systemPrompt });

    if (!messages || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, systemPrompt' },
        { status: 400 }
      );
    }

    const functionUrl = 'https://asia-south1-jai-ai-30103.cloudfunctions.net/streamChatSSE';

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Sign in required' },
        { status: 401 }
      );
    }

    console.log('[AI CHAT API] Proxying to Firebase...');

    // Set up timeout (60 seconds to match Firebase function timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    // Call Firebase function with POST + JSON
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, systemPrompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI CHAT API] Firebase error:', response.status, errorText);
      return NextResponse.json(
        { error: `Firebase error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    console.log('[AI CHAT API] Streaming response from Firebase...');

    // Stream the response back to browser
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('[AI CHAT API] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
