import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

const FILE_CONTENTS = {
  'package.json': `{
  "name": "abu-omar-ledger",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.344.0",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.1/xlsx-0.20.1.tgz",
    "@google/genai": "^0.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.4.2",
    "vite": "^5.1.5"
  }
}`,
  'index.html': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>أبو عمر - نظام إدارة عهد السائقين</title>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: 'Cairo', sans-serif; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`,
  'services/geminiService.ts': `import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const analyzeDataWithGemini = async (transactions: Transaction[], query: string, apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const dataSummary = transactions.map(t => ({
    date: t.date.split('T')[0],
    driver: t.driverName,
    car: t.vehicleNumber,
    route: t.route,
    totalExpenses: t.totalExpenses,
    fuel: t.expenses.fuel,
    maintenance: t.expenses.maintenance,
    net: t.netBalance
  })).slice(-50); 

  const prompt = \`
    You are a financial assistant for a logistics/driver management system called "Abu Omar".
    Here is the recent transaction data (JSON format):
    \${JSON.stringify(dataSummary)}

    User Query: "\${query}"

    Please analyze the data and provide a helpful, concise answer in Arabic.
    Focus on insights, anomalies, or specific values requested.
    If the answer involves money, use EGP currency format.
  \`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، حدث خطأ أثناء تحليل البيانات. تأكد من صحة مفتاح API.";
  }
};`,
  'components/AIAssistant.tsx': `import React, { useState } from 'react';
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
  const [apiKey, setApiKey] = useState(''); 
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;

    if (!apiKey) {
        setShowKeyInput(true);
        return;
    }

    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const response = await analyzeDataWithGemini(transactions, userMsg, apiKey);
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
          <div key={idx} className={\`flex \${msg.role === 'user' ? 'justify-start' : 'justify-end'}\`}>
            <div className={\`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed \${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
            }\`}>
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
        {showKeyInput ? (
            <div className="mb-2 space-y-2">
                <p className="text-xs text-red-500">مطلوب مفتاح Gemini API للعمل:</p>
                <input 
                    type="password" 
                    placeholder="أدخل API Key هنا..."
                    className="w-full border p-2 rounded text-sm"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                />
                <button 
                    onClick={() => setShowKeyInput(false)}
                    className="w-full bg-slate-800 text-white text-xs py-1 rounded"
                >
                    حفظ ومتابعة
                </button>
            </div>
        ) : null}
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

export default AIAssistant;`,
  'components/TransactionTable.tsx': `import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, BalanceStatus, Expenses } from '../types';
import { formatCurrency, formatDate, calculateTransaction, toArabicNumerals, getArabicDayName } from '../utils';
import { Trash2, Edit, Check, ChevronUp, Filter, X, CheckSquare, Square } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onCashUpdate: (id: string, value: number) => void;
  onQuickAdd: (transaction: Transaction) => void;
  onSettlementDateUpdate: (id: string, date: string) => void;
}

const getColumnValue = (t: Transaction, key: string): string => {
  switch (key) {
    case 'day': return getArabicDayName(t.date);
    case 'date': return t.date.split('T')[0];
    case 'driverName': return t.driverName;
    case 'vehicleNumber': return t.vehicleNumber;
    case 'supervisor': return t.supervisor;
    case 'branchesCount': return t.branchesCount.toString();
    case 'route': return t.route;
    case 'custodyAmount': return t.custodyAmount.toString();
    case 'roadTolls': return t.expenses.roadTolls?.toString() || '0';
    case 'scale': return t.expenses.scale?.toString() || '0';
    case 'fuel': return t.expenses.fuel?.toString() || '0';
    case 'tips': return t.expenses.tips?.toString() || '0';
    case 'trafficFines': return t.expenses.trafficFines?.toString() || '0';
    case 'maintenance': return t.expenses.maintenance?.toString() || '0';
    case 'totalExpenses': return t.totalExpenses.toString();
    case 'cashRepayment': return t.cashRepayment ? t.cashRepayment.toString() : '0';
    case 'settlementDate': return t.settlementDate ? t.settlementDate.split('T')[0] : '';
    case 'status': return t.status;
    default: return '';
  }
};

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onDelete, onEdit, onCashUpdate, onQuickAdd, onSettlementDateUpdate }) => {
  const defaultNewRow = {
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    vehicleNumber: '',
    supervisor: '',
    branchesCount: '',
    route: '',
    custodyAmount: '',
    cashRepayment: '',
    expenses: { fuel: '', roadTolls: '', scale: '', maintenance: '', tips: '', trafficFines: '' },
    notes: ''
  };

  const [newRow, setNewRow] = useState(defaultNewRow);
  const [dailyManualInputs, setDailyManualInputs] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(50);
  
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.filter-container')) return;
      setOpenFilterColumn(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUniqueValues = (key: string) => {
    const values = new Set<string>();
    transactions.forEach(t => {
      const val = getColumnValue(t, key);
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      return Object.entries(activeFilters).every(([key, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true; 
        const val = getColumnValue(t, key);
        return selectedValues.includes(val);
      });
    });
  }, [transactions, activeFilters]);

  const visibleTransactions = useMemo(() => {
    if (filteredTransactions.length <= visibleCount) return filteredTransactions;
    return filteredTransactions.slice(filteredTransactions.length - visibleCount);
  }, [filteredTransactions, visibleCount]);

  const liveCalculations = useMemo(() => {
    const expenses = {
      fuel: Number(newRow.expenses.fuel) || 0,
      roadTolls: Number(newRow.expenses.roadTolls) || 0,
      scale: Number(newRow.expenses.scale) || 0,
      maintenance: Number(newRow.expenses.maintenance) || 0,
      tips: Number(newRow.expenses.tips) || 0,
      trafficFines: Number(newRow.expenses.trafficFines) || 0,
    };
    
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    const custody = Number(newRow.custodyAmount) || 0;
    const cash = Number(newRow.cashRepayment) || 0;
    const netBalance = (totalExpenses + cash) - custody;

    return { totalExpenses, netBalance };
  }, [newRow]);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, any> = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.split('T')[0];
      if (!totals[dateKey]) {
        totals[dateKey] = {
          custody: 0,
          ahmedCustody: 0,
          fuel: 0, roadTolls: 0, scale: 0, maintenance: 0, tips: 0, trafficFines: 0,
          totalExpenses: 0, cashRepayment: 0, netBalance: 0
        };
      }
      totals[dateKey].custody += t.custodyAmount;
      if (t.supervisor && t.supervisor.includes('احمد')) {
        totals[dateKey].ahmedCustody += t.custodyAmount;
      }
      totals[dateKey].fuel += (t.expenses.fuel || 0);
      totals[dateKey].roadTolls += (t.expenses.roadTolls || 0);
      totals[dateKey].scale += (t.expenses.scale || 0);
      totals[dateKey].maintenance += (t.expenses.maintenance || 0);
      totals[dateKey].tips += (t.expenses.tips || 0);
      totals[dateKey].trafficFines += (t.expenses.trafficFines || 0);
      totals[dateKey].totalExpenses += t.totalExpenses;
      totals[dateKey].cashRepayment += (t.cashRepayment || 0);
      totals[dateKey].netBalance += t.netBalance;
    });
    return totals;
  }, [filteredTransactions]);

  const handleQuickSave = () => {
    if (!newRow.driverName) return;
    const expensesSum = 
      (Number(newRow.expenses.fuel) || 0) +
      (Number(newRow.expenses.roadTolls) || 0) +
      (Number(newRow.expenses.scale) || 0) +
      (Number(newRow.expenses.maintenance) || 0) +
      (Number(newRow.expenses.tips) || 0) +
      (Number(newRow.expenses.trafficFines) || 0);
    
    const calcNet = (expensesSum + (Number(newRow.cashRepayment) || 0)) - (Number(newRow.custodyAmount) || 0);
    const settlementDate = calcNet === 0 ? newRow.date : undefined;

    const transaction = calculateTransaction({
      date: newRow.date,
      driverName: newRow.driverName,
      vehicleNumber: newRow.vehicleNumber,
      supervisor: newRow.supervisor,
      branchesCount: Number(newRow.branchesCount) || 0,
      route: newRow.route,
      custodyAmount: Number(newRow.custodyAmount) || 0,
      cashRepayment: Number(newRow.cashRepayment) || 0,
      settlementDate: settlementDate,
      expenses: {
        fuel: Number(newRow.expenses.fuel) || 0,
        roadTolls: Number(newRow.expenses.roadTolls) || 0,
        scale: Number(newRow.expenses.scale) || 0,
        maintenance: Number(newRow.expenses.maintenance) || 0,
        tips: Number(newRow.expenses.tips) || 0,
        trafficFines: Number(newRow.expenses.trafficFines) || 0,
      },
      notes: newRow.notes
    });

    onQuickAdd(transaction);
    setNewRow(defaultNewRow);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleQuickSave();
  };

  const updateNewRow = (field: string, value: any) => setNewRow(prev => ({ ...prev, [field]: value }));
  const updateNewExpense = (field: keyof Expenses, value: any) => setNewRow(prev => ({ ...prev, expenses: { ...prev.expenses, [field]: value } }));

  const toggleFilter = (key: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[key];
      const allValues = getUniqueValues(key);
      const currentSelection = current === undefined ? allValues : current;

      if (currentSelection.includes(value)) {
         const newSelection = currentSelection.filter(v => v !== value);
         return { ...prev, [key]: newSelection };
      } else {
         const newSelection = [...currentSelection, value];
         if (newSelection.length === allValues.length) {
            const { [key]: _, ...rest } = prev;
            return rest;
         }
         return { ...prev, [key]: newSelection };
      }
    });
  };

  const FilterHeader = ({ label, columnKey, width, className }: { label: string, columnKey: string, width: string, className?: string }) => {
    const uniqueValues = useMemo(() => getUniqueValues(columnKey), [transactions, columnKey]);
    const isActive = activeFilters[columnKey] !== undefined;
    const isOpen = openFilterColumn === columnKey;

    const isAllSelected = activeFilters[columnKey] === undefined || activeFilters[columnKey].length === uniqueValues.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setActiveFilters(prev => ({ ...prev, [columnKey]: [] }));
        } else {
            setActiveFilters(prev => {
                const { [columnKey]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    return (
      <th className={\`\${width} px-1 py-2 text-center relative group \${className || ''}\`}>
        <div className="flex items-center justify-center gap-1">
           <span>{label}</span>
           <button 
             onClick={(e) => { e.stopPropagation(); setOpenFilterColumn(isOpen ? null : columnKey); }}
             className={\`p-0.5 rounded hover:bg-slate-200 \${isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 opacity-50 group-hover:opacity-100'}\`}
           >
             <Filter className="w-3 h-3" strokeWidth={3} />
           </button>
        </div>
        
        {isOpen && (
           <div className="filter-container absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 text-right overflow-hidden flex flex-col max-h-64">
             <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">تصفية ({uniqueValues.length})</span>
                <button onClick={() => setOpenFilterColumn(null)}><X className="w-3 h-3 text-slate-400" /></button>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded border-b border-slate-100 mb-1 pb-2">
                    <input 
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                    />
                    <span className="text-xs font-bold text-slate-800">اختيار الكل</span>
                </label>

                {uniqueValues.map(val => {
                   const isChecked = activeFilters[columnKey] === undefined || activeFilters[columnKey].includes(val);
                   return (
                     <label key={val} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                       <input 
                         type="checkbox" 
                         checked={isChecked}
                         onChange={() => toggleFilter(columnKey, val)}
                         className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                       />
                       <span className="text-xs text-slate-700 truncate">{val === 'CREDIT' ? 'له' : val === 'DEBIT' ? 'عليه' : val === 'BALANCED' ? 'خالص' : val}</span>
                     </label>
                   )
                })}
             </div>
           </div>
        )}
      </th>
    );
  };

  const renderBalanceCell = (amount: number, status: string | BalanceStatus) => {
      let colorClass = "bg-green-100 text-green-900 font-bold border-green-300";
      let label = "خالص";
      if (amount > 0) {
        colorClass = "bg-yellow-100 text-yellow-900 font-bold border-yellow-300";
        label = "له";
      } else if (amount < 0) {
        colorClass = "bg-red-100 text-red-900 font-bold border-red-300";
        label = "عليه";
      }
      return (
        <div className={\`px-1 py-1 rounded border text-center flex flex-col items-center justify-center w-full h-full \${colorClass}\`}>
          <span className="text-base font-black leading-none">{formatCurrency(Math.abs(amount))}</span>
          <span className="text-[10px] opacity-80">{label}</span>
        </div>
      );
  };

  const inputStyle = "w-full text-base px-1 py-1 border border-slate-300 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400 text-center";
  const numCellClass = "px-1 py-2 whitespace-nowrap text-center font-bold text-lg";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[75vh]">
      <div 
        dir="ltr"
        className={\`overflow-auto flex-1 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700\`}
      >
        <table dir="rtl" className="w-full text-sm text-right border-collapse relative">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold sticky top-0 z-10 shadow-sm text-sm select-none">
            <tr>
              <FilterHeader label="اليوم" columnKey="day" width="w-16" />
              <FilterHeader label="التاريخ" columnKey="date" width="w-20" />
              <FilterHeader label="السائق" columnKey="driverName" width="w-24" />
              <FilterHeader label="السيارة" columnKey="vehicleNumber" width="w-16" />
              <FilterHeader label="المشرف" columnKey="supervisor" width="w-16" />
              <FilterHeader label="الفروع" columnKey="branchesCount" width="w-12" />
              <FilterHeader label="الخط" columnKey="route" width="w-16" />
              
              <FilterHeader label="العهدة" columnKey="custodyAmount" width="w-20" />
              
              <FilterHeader label="كارتة" columnKey="roadTolls" width="w-12" />
              <FilterHeader label="ميزان" columnKey="scale" width="w-12" />
              <FilterHeader label="سولار" columnKey="fuel" width="w-12" />
              <FilterHeader label="اكرامية" columnKey="tips" width="w-12" />
              <FilterHeader label="مصالحة" columnKey="trafficFines" width="w-12" />
              <FilterHeader label="صيانة" columnKey="maintenance" width="w-12" />
              <FilterHeader label="المصاريف" columnKey="totalExpenses" width="w-20" />
              
              <FilterHeader label="نقدي" columnKey="cashRepayment" width="w-40" className="text-green-800 bg-green-50/50" />
              <FilterHeader label="ت. التسوية" columnKey="settlementDate" width="w-28" className="text-slate-700 bg-slate-50 text-xs" />

              <FilterHeader label="الصافي" columnKey="status" width="w-20" />
              <th className="px-1 py-2 w-20 text-center font-bold text-indigo-800 bg-indigo-50/50">تراكمي</th>
              <th className="px-1 py-2 w-32 text-center bg-slate-50">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-base">
             {visibleTransactions.length === 0 && (
                <tr><td colSpan={20} className="text-center py-8 text-slate-400">لا توجد بيانات تطابق التصفية الحالية</td></tr>
             )}
             {filteredTransactions.length > visibleCount && (
              <tr>
                <td colSpan={20} className="p-2 text-center bg-slate-50">
                  <button 
                    onClick={handleLoadMore}
                    className="flex items-center justify-center gap-2 mx-auto px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition-colors text-sm"
                  >
                    <ChevronUp className="w-4 h-4" />
                    عرض المعاملات السابقة
                  </button>
                </td>
              </tr>
            )}
            {visibleTransactions.map((t, index) => {
              const cumBal = t.cumulativeBalance || 0;
              const dateKey = t.date.split('T')[0];
              const isNewDay = index > 0 && dateKey !== visibleTransactions[index - 1].date.split('T')[0];
              const isLastOfDay = index === visibleTransactions.length - 1 || dateKey !== visibleTransactions[index + 1].date.split('T')[0];
              
              let rowClass = "hover:bg-slate-50 transition-colors group";
              if (t.supervisor && t.supervisor.includes('احمد')) {
                rowClass = "bg-amber-100 hover:bg-amber-200 transition-colors group";
              }

              let driverColorClass = "text-slate-900";
              if (t.netBalance > 0) driverColorClass = "text-yellow-600";
              else if (t.netBalance < 0) driverColorClass = "text-red-600";
              else driverColorClass = "text-green-600";

              return (
                <React.Fragment key={t.id}>
                  <tr className={\`\${rowClass} \${isNewDay ? '!border-t-2 !border-slate-900' : ''}\`}>
                    <td className="px-1 py-2 text-center text-slate-500 text-sm bg-slate-50/50">{getArabicDayName(t.date)}</td>
                    <td className="px-1 py-2 text-center text-sm">{formatDate(t.date)}</td>
                    <td className={\`px-1 py-2 text-center font-bold text-sm \${driverColorClass} break-words\`}>{t.driverName}</td>
                    <td className="px-1 py-2 text-center font-bold text-slate-700 text-lg">{toArabicNumerals(t.vehicleNumber)}</td>
                    <td className="px-1 py-2 text-center text-sm text-slate-700">{t.supervisor}</td>
                    <td className="px-1 py-2 text-center font-bold text-lg text-slate-900">{toArabicNumerals(t.branchesCount) || '-'}</td>
                    <td className="px-1 py-2 text-center text-sm">{t.route}</td>
                    <td className="px-1 py-2 text-center font-bold text-blue-700 bg-blue-50/30 text-lg">{formatCurrency(t.custodyAmount)}</td>
                    
                    <td className={numCellClass}>{t.expenses.roadTolls ? toArabicNumerals(t.expenses.roadTolls) : '-'}</td>
                    <td className={numCellClass}>{t.expenses.scale ? toArabicNumerals(t.expenses.scale) : '-'}</td>
                    <td className={numCellClass}>{t.expenses.fuel ? toArabicNumerals(t.expenses.fuel) : '-'}</td>
                    <td className={numCellClass}>{t.expenses.tips ? toArabicNumerals(t.expenses.tips) : '-'}</td>
                    <td className={numCellClass}>{t.expenses.trafficFines ? toArabicNumerals(t.expenses.trafficFines) : '-'}</td>
                    <td className={numCellClass}>{t.expenses.maintenance ? toArabicNumerals(t.expenses.maintenance) : '-'}</td>

                    <td className="px-1 py-2 text-center font-bold text-slate-900 text-lg">{formatCurrency(t.totalExpenses)}</td>
                    
                    <td className="px-1 py-2 bg-green-50/30">
                      <input type="number" value={t.cashRepayment === 0 ? '' : t.cashRepayment} placeholder="-" onChange={(e) => onCashUpdate(t.id, Number(e.target.value))} className="w-full px-1 py-1 text-base text-center font-bold text-green-700 bg-white/50 border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none" />
                    </td>
                    <td className="px-1 py-2">
                      <input type="date" value={t.settlementDate ? t.settlementDate.split('T')[0] : ''} onChange={(e) => onSettlementDateUpdate(t.id, e.target.value)} className="w-full bg-transparent text-sm text-slate-600 border-none focus:ring-0 text-center p-0" />
                    </td>
                    <td className="px-1 py-1">{renderBalanceCell(t.netBalance, t.status)}</td>
                    <td className="px-1 py-1 bg-indigo-50/20">{renderBalanceCell(cumBal, 'BALANCED')}</td>
                    <td className="px-1 py-2 relative">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs text-slate-700 truncate w-full" title={t.notes}>{t.notes || '-'}</span>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 bg-white shadow-sm border rounded">
                          <button onClick={() => onEdit(t)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {isLastOfDay && dailyTotals[dateKey] && (() => {
                     const total = dailyTotals[dateKey];
                     const adjustedCustody = total.custody - total.ahmedCustody;
                     const manualAmount = Number(dailyManualInputs[dateKey]) || 0;
                     const difference = manualAmount - adjustedCustody;
                     return (
                      <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-900 text-sm">
                         <td className="px-1 py-2 text-center" colSpan={7}>
                            <div className="flex flex-col gap-0.5 items-start">
                               <span>{formatDate(t.date)}</span>
                               <span className="text-xs font-normal text-slate-300 opacity-75">بدون أحمد: {formatCurrency(adjustedCustody)}</span>
                            </div>
                         </td>
                         <td className="px-1 py-2 text-center text-lg text-blue-200">{formatCurrency(total.custody)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.roadTolls)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.scale)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.fuel)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.tips)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.trafficFines)}</td>
                         <td className="px-0.5 py-2 text-center text-base opacity-75">{toArabicNumerals(total.maintenance)}</td>
                         <td className="px-1 py-2 text-center text-lg text-orange-200">{formatCurrency(total.totalExpenses)}</td>
                         <td className="px-1 py-2 text-center text-lg text-green-200">{formatCurrency(total.cashRepayment)}</td>
                         <td colSpan={1}></td>
                         <td className="px-1 py-2 text-center" colSpan={4}>
                            <div className="flex items-center gap-1 justify-end px-1 text-xs">
                               <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400">عهدة</span><span className="text-blue-200">{formatCurrency(adjustedCustody)}</span></div>
                               <span>-</span>
                               <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400">يدوي</span><input type="number" value={dailyManualInputs[dateKey] || ''} onChange={(e) => setDailyManualInputs(prev => ({...prev, [dateKey]: e.target.value}))} className="w-16 px-1 py-0 text-center text-slate-900 rounded font-bold bg-white text-sm border-white" placeholder="0" /></div>
                               <span>=</span>
                               <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400">متبقي</span><span className={\`text-base font-bold \${difference < 0 ? 'text-red-400' : 'text-green-400'}\`}>{formatCurrency(difference)}</span></div>
                            </div>
                         </td>
                      </tr>
                     );
                  })()}
                </React.Fragment>
              );
            })}
            <tr className="bg-white border-t border-slate-200 hover:bg-slate-50 transition-colors">
               <td className="px-1 py-2 text-center text-slate-400 text-sm">{newRow.date ? getArabicDayName(newRow.date) : '-'}</td>
               <td className="px-1 py-2"><input type="date" value={newRow.date} onChange={e => updateNewRow('date', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2"><input type="text" placeholder="السائق" value={newRow.driverName} onChange={e => updateNewRow('driverName', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2"><input type="text" placeholder="السيارة" value={newRow.vehicleNumber} onChange={e => updateNewRow('vehicleNumber', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2"><input type="text" placeholder="مشرف" value={newRow.supervisor} onChange={e => updateNewRow('supervisor', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2"><input type="number" placeholder="#" value={newRow.branchesCount} onChange={e => updateNewRow('branchesCount', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2"><input type="text" placeholder="خط" value={newRow.route} onChange={e => updateNewRow('route', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2 bg-blue-50/30"><input type="number" placeholder="عهدة" value={newRow.custodyAmount} onChange={e => updateNewRow('custodyAmount', e.target.value)} onKeyDown={handleKeyDown} className={\`\${inputStyle} text-blue-700 font-bold\`} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="ك" value={newRow.expenses.roadTolls} onChange={e => updateNewExpense('roadTolls', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="م" value={newRow.expenses.scale} onChange={e => updateNewExpense('scale', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="س" value={newRow.expenses.fuel} onChange={e => updateNewExpense('fuel', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="إ" value={newRow.expenses.tips} onChange={e => updateNewExpense('tips', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="م" value={newRow.expenses.trafficFines} onChange={e => updateNewExpense('trafficFines', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-0.5 py-2"><input type="number" placeholder="ص" value={newRow.expenses.maintenance} onChange={e => updateNewExpense('maintenance', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} /></td>
               <td className="px-1 py-2 font-bold text-slate-900 text-center text-lg">{liveCalculations.totalExpenses > 0 ? formatCurrency(liveCalculations.totalExpenses) : '-'}</td>
               <td className="px-1 py-2 bg-green-50/30"><input type="number" placeholder="نقدي" value={newRow.cashRepayment} onChange={e => updateNewRow('cashRepayment', e.target.value)} onKeyDown={handleKeyDown} className={\`\${inputStyle} text-green-700 font-bold border-green-300\`} /></td>
               <td className="px-1 py-2 text-center text-slate-300">-</td>
               <td className="px-1 py-2">
                 <div className={\`px-1 py-1 rounded border text-center flex flex-col items-center justify-center w-full h-full \${liveCalculations.netBalance > 0 ? 'bg-yellow-100 text-yellow-900 font-bold border-yellow-300' : liveCalculations.netBalance < 0 ? 'bg-red-100 text-red-900 font-bold border-red-300' : 'bg-green-100 text-green-900 font-bold border-green-300'}\`}>
                    <span className="text-base font-black leading-none">{liveCalculations.netBalance !== 0 ? formatCurrency(Math.abs(liveCalculations.netBalance)) : '-'}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">{liveCalculations.netBalance > 0 ? 'له' : liveCalculations.netBalance < 0 ? 'عليه' : 'خالص'}</span>
                 </div>
               </td>
               <td className="px-1 py-2 text-center text-slate-300">-</td>
               <td className="px-1 py-2 relative flex items-center gap-1">
                 <input type="text" placeholder="ملاحظات" value={newRow.notes} onChange={e => updateNewRow('notes', e.target.value)} onKeyDown={handleKeyDown} className={inputStyle} />
                 <button onClick={handleQuickSave} disabled={!newRow.driverName} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"><Check className="w-4 h-4" /></button>
               </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;`
};

export const SourceCodeViewer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeFile, setActiveFile] = useState('App.tsx');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(FILE_CONTENTS[activeFile as keyof typeof FILE_CONTENTS]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
             <h2 className="text-3xl font-bold text-slate-800">الكود المصدري للتطبيق</h2>
             <div className="flex gap-2">
                {Object.keys(FILE_CONTENTS).map(file => (
                    <button
                        key={file}
                        onClick={() => setActiveFile(file)}
                        className={`px-4 py-2 rounded-lg text-lg font-medium transition-colors ${activeFile === file ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                    >
                        {file}
                    </button>
                ))}
             </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-bold text-lg"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'تم النسخ' : 'نسخ الكود'}
            </button>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-8 h-8 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-white p-6 relative" dir="ltr">
          <pre className="text-slate-900 font-mono text-base leading-relaxed whitespace-pre-wrap selection:bg-blue-100 selection:text-blue-900">
            {FILE_CONTENTS[activeFile as keyof typeof FILE_CONTENTS]}
          </pre>
        </div>
      </div>
    </div>
  );
};