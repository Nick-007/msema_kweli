import fetch from 'node-fetch';

// Helper function to poll messages from Telegram
export async function GET(request) {
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getUpdates`;
  
    try {
      const response = await fetch(TELEGRAM_API_URL, {
        method: 'GET',
      });
  
      const data = await response.json();
      if (data.ok) {
        const updates = data.result;
        
        // Process each update (new messages, etc.)
        const formattedUpdates = updates.map((update: { message: { chat: { id: number; }; text: string; }; }) => {
            const chatId = update.message.chat.id;
            const message = update.message.text;
    
            return {
                chatId: chatId,
                message: message
              };
          });
          return new Response(JSON.stringify(formattedUpdates), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
      } else {
        return new Response(JSON.stringify(`{${data.description}: 'Error retrieving updates' }`), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error fetching updates' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
    }
  }
  