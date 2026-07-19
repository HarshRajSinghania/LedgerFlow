import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';

const SUGGESTED = [
  'Which supplier is riskiest?',
  "What's the total exposure?",
  'How many lines are missing a PO?',
];

export default function AskAIPanel({ jobId, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Ask me anything about this reconciliation run — suppliers, exposure, risk flags. I'll only answer from the actual data in front of me.",
      confidence: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`/api/reconcile/${jobId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, confidence: data.confidence }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Couldn't get an answer: ${err.message}`, confidence: null, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2c2520]/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-[#fdfcfa] border-l border-[#dcd6cd] shadow-[-4px_0_16px_rgba(44,37,32,0.12)] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dcd6cd] bg-[#ffffff]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#be5a38]/8 border border-[#be5a38]/25 rounded flex items-center justify-center text-[#be5a38]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-serif font-bold text-sm text-[#2c2520] block leading-none">Ask LedgerFlow AI</span>
              <span className="text-[9px] font-mono text-[#73675c] uppercase tracking-wider">Grounded in this run's data</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#73675c] hover:text-[#be5a38] rounded border border-transparent hover:border-[#dcd6cd] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 flex-shrink-0 rounded flex items-center justify-center border mt-0.5 ${
                m.role === 'user'
                  ? 'bg-[#f7f4eb] border-[#dcd6cd] text-[#73675c]'
                  : 'bg-[#be5a38]/8 border-[#be5a38]/25 text-[#be5a38]'
              }`}>
                {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block text-left px-3.5 py-2.5 rounded text-[13px] leading-relaxed font-serif ${
                  m.role === 'user'
                    ? 'bg-[#2c2520] text-[#fdfcfa]'
                    : m.error
                    ? 'bg-[#faf3f1] border border-[#be5a38]/30 text-[#be5a38]'
                    : 'bg-[#ffffff] border border-[#dcd6cd] text-[#2c2520]'
                }`}>
                  {m.text}
                </div>
                {m.confidence && (
                  <span className="block text-[8px] font-mono text-[#73675c] mt-1 uppercase tracking-wider">
                    {m.confidence}
                  </span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center border border-[#be5a38]/25 bg-[#be5a38]/8 text-[#be5a38] mt-0.5">
                <Bot className="w-3 h-3" />
              </div>
              <div className="px-3.5 py-2.5 rounded bg-[#ffffff] border border-[#dcd6cd] text-[#73675c] text-[13px] font-mono">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#73675c] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-[#73675c] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-[#73675c] rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[10px] font-mono px-2.5 py-1.5 bg-[#f7f4eb] border border-[#dcd6cd] text-[#73675c] hover:text-[#2c2520] hover:border-[#be5a38]/40 rounded transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2 px-4 py-3.5 border-t border-[#dcd6cd] bg-[#ffffff]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about suppliers, exposure, risk..."
            className="flex-1 text-sm px-3 py-2 border border-[#dcd6cd] rounded bg-[#fdfcfa] text-[#2c2520] placeholder:text-[#b8ad9e] focus:outline-none focus:border-[#be5a38]/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-[#be5a38] hover:bg-[#a64c2e] disabled:bg-[#eae3d2] disabled:text-[#b8ad9e] text-white rounded transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
