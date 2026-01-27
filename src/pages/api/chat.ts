import type { APIRoute } from 'astro';

const N8N_WEBHOOK_URL = import.meta.env.PUBLIC_N8N_WEBHOOK_URL || '';

export const POST: APIRoute = async ({ request }) => {
  console.log('Chat API called, webhook URL:', N8N_WEBHOOK_URL ? 'configured' : 'NOT configured');

  if (!N8N_WEBHOOK_URL) {
    console.error('N8N_WEBHOOK_URL is empty');
    return new Response(JSON.stringify({ error: 'Webhook URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `n8n error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Chat proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to chat service' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
