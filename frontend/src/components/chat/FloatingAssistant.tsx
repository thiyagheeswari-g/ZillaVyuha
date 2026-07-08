import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am ZillaVyuha Assistant. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeFlowId = useStore(state => state.activeFlowId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!activeFlowId) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: input.trim() }]);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: 'Please upload data and run the AI pipeline before asking questions.' }]);
      setInput('');
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, flow_id: activeFlowId })
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: data.answer }]);
    } catch (error) {
      console.error("Chatbot API Error:", error);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: 'Sorry, I encountered an error connecting to the intelligence backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={`fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-accent-blue)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}>
        <MessageSquare size={24} />
      </button>

      <div className={`fixed bottom-6 right-6 w-[400px] h-[600px] bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl shadow-2xl flex flex-col z-50 ${isOpen ? 'flex' : 'hidden'}`}>
        <div className="h-16 bg-accent-gradient flex items-center justify-between px-4 text-white shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Bot size={20} />
            <h3 className="font-semibold">Ask ZillaVyuha</h3>
          </div>
          <button onClick={() => setIsOpen(false)}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-bg-app)]">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-[#2A3441]' : 'bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)]'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-[var(--color-text-secondary)]">Analyzing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border-subtle)] flex gap-2 rounded-b-2xl">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] rounded-xl px-4 text-sm outline-none text-white" placeholder="Ask something..." />
          <button type="submit" disabled={!input.trim() || loading} className="w-11 h-11 bg-[var(--color-accent-blue)] text-white rounded-xl flex items-center justify-center disabled:opacity-50"><Send size={18} /></button>
        </form>
      </div>
    </>
  );
};
