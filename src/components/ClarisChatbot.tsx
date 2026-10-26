'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  MessageSquare,
  ChevronDown,
  RotateCcw,
  Bot,
  User,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'claris';
  text: string;
  timestamp: string;
  source?: 'ai' | 'dictionary' | 'fallback';
}

interface ClarisChatbotProps {
  reportContext?: string;
}

const DEFAULT_SUGGESTIONS = [
  'What is eGFR?',
  'Explain MCV & MCH',
  'What does Bilirubin measure?',
  'Why test Triglycerides?',
  'What is TSH in blood work?',
];

export function ClarisChatbot({ reportContext }: ClarisChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'claris',
      text: "Hello! I'm **Claris.ai**, your personal medical terminology assistant.\n\nAsk me about any lab term, clinical acronym, or reference range on your report (e.g. *What is eGFR?* or *Why do doctors test Platelets?*), and I will explain it in simple, plain language!",
      timestamp: 'Just now',
      source: 'dictionary',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/claris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          reportContext,
        }),
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await res.json();
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'claris',
        text: data.reply || 'I am having trouble retrieving that term right now. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'claris',
        text: "I couldn't connect right now. You can try asking about common biomarkers like **Hemoglobin**, **Glucose**, or **Creatinine**!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'fallback',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'claris',
        text: "Conversation cleared. Feel free to ask about any medical term or laboratory test abbreviation!",
        timestamp: 'Just now',
        source: 'dictionary',
      },
    ]);
  };

  // Helper to format basic markdown-like bold/italics
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      // Process bold **text**
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-bold text-ink">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={partIdx} className="italic text-ink/90">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans select-none">
      {/* 1. RETRACTED FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-lime text-ink border-2 border-ink rounded-full shadow-[4px_4px_0_#141414] hover:shadow-[6px_6px_0_#141414] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0_#141414] transition-all cursor-pointer"
          title="Open Claris.ai terminology assistant"
          aria-label="Open Claris.ai terminology assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#128a76]"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-ink" />
            <span className="font-bold text-xs tracking-tight uppercase">Claris.ai</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-medium text-ink/80 border-l border-ink/20 pl-2">
            Ask Terminology
          </span>
          <Sparkles className="w-3.5 h-3.5 text-coral group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* 2. EXPANDED RETRACTABLE CHAT WINDOW */}
      {isOpen && (
        <div className="flex flex-col w-[350px] sm:w-[400px] h-[530px] max-h-[82vh] bg-cream border-2 border-ink rounded-2xl shadow-[8px_8px_0_#141414] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#f7f6f0] border-b-2 border-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-lime border-2 border-ink flex items-center justify-center shadow-[1.5px_1.5px_0_#141414]">
                <Bot className="w-4 h-4 text-ink" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-ink uppercase tracking-wide">Claris.ai</h3>
                  <span className="px-1.5 py-0.2 bg-[#e2f3df] border border-[#2b6a2b]/30 text-[#1a551a] text-[9px] font-bold rounded-sm">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-muted font-medium">Plain-Language Medical Guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-ink/70 hover:text-ink hover:bg-ink/5 rounded-md transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-ink hover:text-coral hover:bg-ink/5 rounded-md transition-colors cursor-pointer"
                title="Minimize Claris.ai"
                aria-label="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#faf9f5]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'claris' && (
                  <div className="w-6 h-6 rounded-md bg-lime border border-ink flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5 text-ink" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-ink text-white font-medium border border-ink rounded-tr-xs'
                      : 'bg-white text-ink border border-ink/20 rounded-tl-xs shadow-[2px_2px_0_rgba(20,20,20,0.05)]'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                  <div
                    className={`mt-1.5 text-[9px] flex items-center justify-between ${
                      msg.sender === 'user' ? 'text-white/60' : 'text-muted'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'claris' && msg.source && (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-ink/50">
                        {msg.source === 'ai' ? '✦ AI Verified' : '✦ Clinical Dict'}
                      </span>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-ink text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-xs text-muted">
                <div className="w-6 h-6 rounded-md bg-lime border border-ink flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-ink" />
                </div>
                <div className="bg-white border border-ink/20 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-medium text-muted ml-1">Claris is translating...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3 py-1.5 bg-[#f5f4ed] border-t border-ink/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-coral" /> Quick:
            </span>
            {DEFAULT_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item)}
                className="text-[10px] bg-white hover:bg-lime border border-ink/20 hover:border-ink px-2 py-0.5 rounded-full whitespace-nowrap text-ink/90 font-medium transition-colors cursor-pointer shrink-0"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Input & Send Bar */}
          <div className="p-2.5 bg-cream border-t-2 border-ink">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any lab term (e.g. eGFR, Bilirubin)..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-ink/30 focus:border-ink focus:ring-1 focus:ring-lime rounded-xl text-ink outline-none transition-all placeholder:text-muted"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-lime text-ink border-2 border-ink rounded-xl shadow-[2px_2px_0_#141414] hover:shadow-[3px_3px_0_#141414] active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                title="Send to Claris.ai"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-muted text-center font-medium">
              <ShieldCheck className="w-2.5 h-2.5 text-[#128a76]" />
              <span>Educational terminology only · Not a medical diagnosis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
