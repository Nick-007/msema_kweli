import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST() {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook`;
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const result = await response.json();
    if (result.ok) {
      return NextResponse.json({ message: 'Webhook set successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error setting webhook' }, { status: 500 });
  }
}
