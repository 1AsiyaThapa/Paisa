'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isError?: boolean;
    debugInfo?: string;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your Paisatrack Financial Assistant AI. I help you track expenses, analyze spending patterns, and manage your finances. Ask me anything about your expenses, income, or budget!'
        }
    ]);

    // Auto-scroll to bottom of messages
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/chatbot/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({ prompt: userMessage.content }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to use the chatbot.');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to get response (${response.status})`);
            }

            const data = await response.json();

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                isError: !!data.error,
                debugInfo: data.debug_info
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('Error calling chatbot API:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorMessage.includes('log in') 
                    ? "Please log in to use the chatbot. Your session may have expired."
                    : "Sorry, I'm having trouble connecting to my brain right now. Please try again later."
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            <div
                className={cn(
                    "absolute bottom-20 right-0 w-80 sm:w-96 transition-all duration-300 ease-in-out transform origin-bottom-right",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-4 pointer-events-none"
                )}
            >
                <Card className="flex flex-col h-[500px] shadow-xl border border-gray-200 overflow-hidden bg-white/80 backdrop-blur-md">
                    {/* Header - Refined to match Dashboard Cards */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight">AI Assistant</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-gray-500 font-medium">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : msg.isError
                                            ? "bg-red-50 text-red-800 border border-red-200 rounded-tl-none"
                                            : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
                                    )}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="markdown-content">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>,
                                                    li: ({ children }) => <li>{children}</li>,
                                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                    em: ({ children }) => <em className="italic">{children}</em>,
                                                    code: ({ children }) => <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                                    pre: ({ children }) => <pre className="bg-gray-100 text-gray-800 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                                                    h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-2">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div>{msg.content}</div>
                                    )}
                                    {msg.debugInfo && (
                                        <div className="mt-2 text-xs text-red-600 font-mono">
                                            {msg.debugInfo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1.5 items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white/50 backdrop-blur-sm border-t border-gray-100">
                        <div className="relative">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="pr-12 py-5 bg-white border-gray-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!inputValue.trim()}
                                size="sm"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Launcher Button - Refined Shadow */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center z-50",
                    isOpen
                        ? "bg-red-500 hover:bg-red-600 rotate-90"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 animate-fade-in"
                )}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                )}
            </Button>
        </div>
    );
}
