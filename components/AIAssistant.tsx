import React, { useState } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles } from 'lucide-react';
import { Transaction } from '../types';
import { analyzeDataWithGemini } from '../services/geminiService';

interface AIAssistantProps {
  transactions: Transaction[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: 'مرحباً! أنا مساعد أبو عمر الذكي. يمكنك سؤالي عن تحليل المصاريف، أداء السائقين، أو أي تفاصيل مالية.' }
  ]);
  const [loading, setLoading] = useState(false);
  
  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const response = await analyzeDataWithGemini(transactions, userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: response || 'لم أتمكن من الحصول على إجابة.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'حدث خطأ في الاتصال بالذكاء الاصطناعي.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40 hover:scale-105 flex items-center gap-2"
      >
        <Sparkles className="w-6 h-6" />
        <span className="font-bold hidden md:inline">المساعد الذكي</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden max-h-[600px]">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          <h3 className="font-bold text-lg">مساعد أبو عمر</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 h-80">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="bg-white border border-slate-200 p-3 rounded-xl rounded-bl-none shadow-sm flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اسأل عن المصاريف..."
            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;