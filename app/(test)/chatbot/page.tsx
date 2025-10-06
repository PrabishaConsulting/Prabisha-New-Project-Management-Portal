'use client'; // This is a client component because it uses state and event handlers

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './_components/ChatMessage';

// Define the shape of a message
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

// Define the shape of the API response
interface ApiResponse {
  status: 'success' | 'not_found';
  answer: string;
  source_question?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your assistant. How can I help you today?",
      sender: 'bot',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: inputValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from bot.');
      }

      const data: ApiResponse = await response.json();
      console.log(data)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: 'bot',
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <main className="flex flex-col h-screen 100">
      <header className="  p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Property FAQ Bot</h1>
      </header>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-start mb-4">
            <div className="200  px-4 py-2 rounded-lg">
              <p>Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className=" border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-grow border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your question here..."
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className=" rounded-full px-6 py-2 font-semibold hover:-600 disabled:400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  );
}