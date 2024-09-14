import { NextRequest } from 'next/server';
import { TextDecoder } from 'util'; // Import TextDecoder for Node.js
import fetch from 'node-fetch';

// Mock storage to track thread IDs by user (you can replace this with a proper database)
const threadStore: Record<number, string> = {}; // Example: { [chatId]: threadId }

// Helper function to send messages to Telegram
async function sendTelegramMessage(chatId: number, message: string): Promise<void> {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;

  await fetch(TELEGRAM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}
async function sendTelegramAction(chatId: number, act: string): Promise<void> {
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendChatAction`;

  await fetch(TELEGRAM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: act }),
  });
}

// Define the structure of the request body
interface Message {
  chat: {
    id: number;
  };
  text: string;
}

// Define the structure of the full request body
interface RequestBody {
  message: Message;
}

    // Define types for event structure
    interface TextContent {
      type: 'text';
      text: {
        value: string;
      };
    }
      // Define types for MessageEventData
    interface MessageEventData {
      id: string;
      object: string;
      created_at: number;
      assistant_id: string;
      thread_id: string;
      run_id: string;
      status: string;
      role: string;
      content: TextContent[];
    }
       // Define types for EventObject
    interface EventObject {
      event: string;
      data: MessageEventData;
    }

    
// Named export for the POST method in Next.js 13+ (app directory)
export async function POST(req: NextRequest): Promise<Response> {
  try {
    // Parse the request body as JSON and validate it
    const body: RequestBody = await req.json();

    if (!body.message || !body.message.chat || !body.message.chat.id || !body.message.text) {
      return new Response(JSON.stringify({ error: 'Invalid request body. Must contain message.chat.id and message.text.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chatId: number = body.message.chat.id;
    const text: string = body.message.text;

    if (text === '/start') {
      const defaultreply = `
        Welcome to Msema Kweli bot, a fact-checking assistant to validate
        development agendas and budget allocations for Kenyan county
        governments ensuring they comply with existing policies.
      `;
      await sendTelegramMessage(chatId, defaultreply);
      // Return a success response to the client
      return new Response(JSON.stringify({ status: 'success', reply: defaultreply }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Check if a thread already exists for this user
    let threadId = threadStore[chatId];

    // If no thread exists, create a new one
    if (!threadId) {
      // Send the user's text to the external API (e.g., OpenAI) and enable streaming
      const startThreadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assistants/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          stream: true, // Enable streaming from OpenAI
        }),
      });

      const startThreadData = await startThreadResponse.json();
      //console.log(JSON.stringify(startThreadData))

      if (!startThreadResponse.ok) {
        const errorText = await startThreadResponse.text();
        console.error('Error from AI API:', startThreadResponse.status, startThreadResponse.statusText, errorText);
        return new Response(JSON.stringify({ error: 'Failed to start thread with AI API' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Extract the new thread ID from the response and store it
      
      threadId = startThreadData.threadId;
      threadStore[chatId] = threadId; // Save the new thread ID for the user
    }

    // Now continue the conversation in the existing thread
    const continueThreadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assistants/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        stream: true, // Enable streaming from OpenAI
      }),
    });

    if (!continueThreadResponse.ok) {
      const errorText = await continueThreadResponse.text();
      console.error('Error from AI API:', continueThreadResponse.status, continueThreadResponse.statusText, errorText);
      return new Response(JSON.stringify({ error: 'Failed to continue thread with AI API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Node.js streaming method to handle the response body
    const decoder = new TextDecoder();
    let aiReply = ''; // Accumulate the entire AI response

    // Stream the response data from the AI API using Node.js stream
    for await (const chunk of continueThreadResponse.body as any) {
      const chunkText = decoder.decode(chunk, { stream: true });
      aiReply += chunkText;

      // Optionally send partial responses to Telegram as chunks arrive
      await sendTelegramAction(chatId, "typing");
    }
// Function to convert API response string into an array of event objects
const convertStringToEventObjects = (responseString: string): EventObject[] => {
  const eventObjects: EventObject[] = [];

  // Split the string by newline or another delimiter that separates JSON objects
  const jsonChunks = responseString.split('\n').filter(chunk => chunk.trim() !== '');

  // Parse each chunk into a JSON object and push to the eventObjects array
  jsonChunks.forEach(chunk => {
    try {
      const eventObject: EventObject = JSON.parse(chunk);
      eventObjects.push(eventObject);
    } catch (error) {
      console.error("Error parsing JSON chunk:", chunk, error);
    }
  });

  return eventObjects;
}    

// Function to collect all message-related events and extract the final message
const processOpenAIEvents = (events: EventObject[]): { finalText: string | null, messageEvents: EventObject[] } => {
  const messageEvents: EventObject[] = []; // Array to hold message events

  // Loop through all events and collect relevant message events
  events.forEach((event) => {
    if (event.event.includes('thread.message')) {
      messageEvents.push(event); // Collect all thread.message events
    }
  });

  // Extract the final message from the 'thread.message.completed' event
  const finalMessageEvent = messageEvents.find(event => event.event === 'thread.message.completed');

  if (finalMessageEvent) {
    const messageData = finalMessageEvent.data;

    // Access the content array which contains the final message
    const contentArray = messageData.content;

    // Check if content exists and extract the text
    if (contentArray && contentArray.length > 0) {
      const finalText = contentArray
        .filter(item => item.type === 'text') // Ensure we are working with text type content
        .map(item => item.text.value)         // Extract the text value
        .join('');                            // Join the text pieces together

      return { finalText, messageEvents }; // Return the final message and collected events
    }
  }

  return { finalText: null, messageEvents }; // Return null if no final message is found but with collected events
}

const eventObjects = convertStringToEventObjects(aiReply);
// Example usage with the JSON data (replace with your actual response)
const response: EventObject[] = eventObjects;
const { finalText, messageEvents } = processOpenAIEvents(response);

console.log("Final message:", finalText);
//console.log("Collected message events:", messageEvents);

    // Send the final accumulated message to Telegram
    await sendTelegramMessage(chatId, finalText);

    // Return a success response to the client
    return new Response(JSON.stringify({ status: 'success', reply: finalText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing the request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}