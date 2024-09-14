'use client'; // Only necessary for client-side components

import { useState, useEffect } from 'react';
import styles from "./tgclient.module.css"; // use simple styles for demonstration purposes
import { json } from 'stream/consumers';

export default function Tgclient() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Fetch the updates from the API route
    const fetchUpdates = async () => {
      try {
        const response = await fetch('/api/telegram/poll', { method: 'GET' });
        const data = await response.json();
        setMessages(data); // Set the response data (formatted updates)
      } catch (error) {
        console.error('Error fetching updates:', JSON.stringify(error));
      }
    };

    fetchUpdates(); // Fetch immediately when the component mounts

    // Optionally, poll periodically every minute
    const intervalId = setInterval(fetchUpdates, 60000);

    // Clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={styles.container}>
      <h2>Telegram Messages:</h2>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>
            <strong>Chat ID:</strong> {msg.chatId} <br />
            <strong>Message:</strong> {msg.message} <br />
          </li>
        ))}
      </ul>
    </div>
  );
}
