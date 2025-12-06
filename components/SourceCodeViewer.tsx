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
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.1/xlsx-0.20.1.tgz"
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
  'App.tsx': `import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  Truck,
  Code,
  Save,
  UploadCloud,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TransactionTable from './components/TransactionTable';
import TransactionForm from './components/TransactionForm';
import StatCard from './components/StatCard';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { Transaction, EXCEL_HEADERS } from './types';
import { calculateTransaction, calculateCumulativeBalances, formatCurrency, getArabicDayName } from './utils';

// Initial Data cleared as requested
const INITIAL_DATA_RAW: any[] = [];

const INITIAL_DATA = INITIAL_DATA_RAW.map((d, i) => calculateTransaction({
  ...d,
  id: \`init-\${i}\`,
  date: new Date('2025-12-05').toISOString(),
  notes: ''
}));

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');
  const [settlementDateFilter, setSettlementDateFilter] = useState('');

  // Load initial data on mount
  useEffect(() => {
    const saved = localStorage.getItem('abu_omar_transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    } else {
      setTransactions(INITIAL_DATA);
    }
  }, []);

  // Save to local storage whenever transactions change
  useEffect(() => {
    localStorage.setItem('abu_omar_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const handleSaveTransaction = (transaction: Transaction) => {
    setTransactions(prev => {
      let updated;
      if (editingTransaction) {
        updated = prev.map(t => t.id === transaction.id ? transaction : t);
      } else {
        // Append new transactions to the END
        updated = [...prev, transaction];
      }
      setEditingTransaction(null);
      return updated;
    });
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الحركة؟')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleInlineCashUpdate = (id: string, val: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        // When cash is entered, auto-set Settlement Date to Today if not already set or if cash changed
        const today = new Date().toISOString();
        return calculateTransaction({ 
          ...t, 
          cashRepayment: val,
          settlementDate: val > 0 ? today : t.settlementDate 
        });
      }
      return t;
    }));
  };

  const handleInlineSettlementDateUpdate = (id: string, date: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, settlementDate: date };
      }
      return t;
    }));
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const headerRow = data[0] as string[];
      const hasDayColumn = headerRow && (headerRow[0] === 'اليوم' || headerRow[0] === 'Day');
      const offset = hasDayColumn ? 1 : 0;

      const newTransactions: Transaction[] = (data.slice(1) as any[]).map((row: any) => {
        const expenses = {
          roadTolls: Number(row[7 + offset]) || 0,
          scale: Number(row[8 + offset]) || 0,
          fuel: Number(row[9 + offset]) || 0,
          tips: Number(row[10 + offset]) || 0,
          trafficFines: Number(row[11 + offset]) || 0,
          maintenance: Number(row[12 + offset]) || 0,
        };

        const dateVal = row[0 + offset];
        const dateStr = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();
        const settlementVal = row[15 + offset];

        return calculateTransaction({
          date: dateStr,
          driverName: row[1 + offset] || '',
          vehicleNumber: row[2 + offset] || '',
          supervisor: row[3 + offset] || '',
          branchesCount: Number(row[4 + offset]) || 0,
          route: row[5 + offset] || '',
          custodyAmount: Number(row[6 + offset]) || 0,
          expenses,
          cashRepayment: Number(row[14 + offset]) || 0,
          settlementDate: settlementVal ? new Date(settlementVal).toISOString() : undefined,
          notes: row[18 + offset] || ''
        });
      });

      setTransactions(prev => [...prev, ...newTransactions]);
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    const processedData = calculateCumulativeBalances(transactions).map(t => [
      getArabicDayName(t.date),
      t.date.split('T')[0],
      t.driverName,
      t.vehicleNumber,
      t.supervisor,
      t.branchesCount,
      t.route,
      t.custodyAmount,
      t.expenses.roadTolls,
      t.expenses.scale,
      t.expenses.fuel,
      t.expenses.tips,
      t.expenses.trafficFines,
      t.expenses.maintenance,
      t.totalExpenses,
      t.cashRepayment,
      t.settlementDate ? t.settlementDate.split('T')[0] : '',
      t.netBalance,
      t.cumulativeBalance,
      t.notes
    ]);

    const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...processedData]);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, 
      { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, 
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العمليات");
    XLSX.writeFile(wb, "تقرير_حركات_السائقين.xlsx", { cellDates: true });
  };

  const handleBackupData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`abu_omar_backup_\${new Date().toISOString().split('T')[0]}.json\`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm('سيتم استبدال البيانات الحالية بالنسخة الاحتياطية. هل أنت متأكد؟')) {
            setTransactions(json);
          }
        } else {
          alert('ملف النسخة الاحتياطية غير صالح');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsText(file);
  };

  const processedTransactions = useMemo(() => {
    let filtered = transactions;
    
    // 1. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.driverName.toLowerCase().includes(q) ||
        t.vehicleNumber.includes(q) ||
        t.route.includes(q) ||
        t.supervisor.includes(q)
      );
    }

    // 2. Status (Color) Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(t => {
        if (statusFilter === 'YELLOW') return t.netBalance > 0;
        if (statusFilter === 'RED') return t.netBalance < 0;
        if (statusFilter === 'GREEN') return t.netBalance === 0;
        return true;
      });
    }

    // 3. Settlement Date Filter
    if (settlementDateFilter) {
      filtered = filtered.filter(t => 
        t.settlementDate && t.settlementDate.split('T')[0] === settlementDateFilter
      );
    }

    return calculateCumulativeBalances(filtered);
  }, [transactions, searchQuery, statusFilter, settlementDateFilter]);

  const stats = useMemo(() => {
    const totalCustody = transactions.reduce((acc, t) => acc + t.custodyAmount, 0);
    const totalExpenses = transactions.reduce((acc, t) => acc + t.totalExpenses, 0);
    const totalCash = transactions.reduce((acc, t) => acc + (t.cashRepayment || 0), 0);
    const netTotal = (totalExpenses + totalCash) - totalCustody;
    return { totalCustody, totalExpenses, totalCash, netTotal };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-2 lg:px-4 h-auto py-2 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-start">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">أبو عمر</h1>
              </div>
            </div>
            {/* Mobile Actions */}
             <div className="flex items-center gap-2 xl:hidden">
                 <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="p-2 bg-blue-600 text-white rounded-lg"><Plus className="w-5 h-5" /></button>
             </div>
          </div>

          {/* Filters Bar */}
          <div className="flex-1 flex flex-col md:flex-row items-center gap-3 w-full">
             {/* Search */}
             <div className="relative group w-full md:w-1/3">
                <input 
                  type="text" 
                  placeholder="بحث..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-lg px-10 py-2 text-base transition-all outline-none text-slate-800 placeholder:text-slate-400"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
             </div>

             {/* Status Filter */}
             <div className="relative w-full md:w-1/4">
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                 <Filter className="w-4 h-4" />
               </div>
               <select 
                 value={statusFilter} 
                 onChange={(e) => setStatusFilter(e.target.value as any)}
                 className="w-full appearance-none bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-lg pr-10 pl-4 py-2 text-base text-slate-700 font-medium cursor-pointer"
               >
                 <option value="ALL">كل الحالات (اللون)</option>
                 <option value="YELLOW">له (أصفر)</option>
                 <option value="RED">عليه (أحمر)</option>
                 <option value="GREEN">خالص (أخضر)</option>
               </select>
             </div>

             {/* Settlement Date Filter */}
             <div className="relative w-full md:w-1/4">
               <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                 <Calendar className="w-4 h-4" />
               </div>
               <input 
                 type="date" 
                 placeholder="تاريخ التسوية"
                 value={settlementDateFilter} 
                 onChange={(e) => setSettlementDateFilter(e.target.value)}
                 className="w-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-lg pr-10 pl-4 py-2 text-base text-slate-700 font-medium cursor-pointer"
               />
               {settlementDateFilter && (
                 <button 
                   onClick={() => setSettlementDateFilter('')}
                   className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                 >
                   ×
                 </button>
               )}
             </div>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <button
              onClick={() => setIsCodeViewOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              title="عرض الكود"
            >
              <Code className="w-5 h-5" />
            </button>

             <label className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer" title="استعادة">
              <UploadCloud className="w-5 h-5" />
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>

            <button
              onClick={handleBackupData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              title="نسخة احتياطية"
            >
              <Save className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-sm text-sm font-bold">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>استيراد</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
            </label>
            
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-sm font-bold"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>تصدير</span>
            </button>
            
            <button
              onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-sm font-bold"
            >
              <Plus className="w-5 h-5" />
              <span>حركة جديدة</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-2 lg:px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="العهد" value={formatCurrency(stats.totalCustody)} icon={Wallet} colorClass="bg-blue-500" />
          <StatCard title="المصاريف" value={formatCurrency(stats.totalExpenses)} icon={TrendingUp} colorClass="bg-orange-500" />
          <StatCard title="النقدية" value={formatCurrency(stats.totalCash)} icon={Wallet} colorClass="bg-green-500" />
           <StatCard title="صافي الشركة" value={formatCurrency(Math.abs(stats.netTotal))} subValue={stats.netTotal > 0 ? "فائض" : "عجز"} icon={AlertCircle} colorClass={stats.netTotal >= 0 ? "bg-indigo-500" : "bg-red-500"} />
        </div>
        <TransactionTable 
          transactions={processedTransactions}
          onDelete={handleDeleteTransaction}
          onEdit={handleEditTransaction}
          onCashUpdate={handleInlineCashUpdate}
          onQuickAdd={handleSaveTransaction}
          onSettlementDateUpdate={handleInlineSettlementDateUpdate}
        />
      </main>

      {isFormOpen && (
        <TransactionForm
          initialData={editingTransaction}
          onSave={handleSaveTransaction}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
        />
      )}

      {isCodeViewOpen && (
        <SourceCodeViewer onClose={() => setIsCodeViewOpen(false)} />
      )}
    </div>
  );
}

export default App;`,
  'components/TransactionTable.tsx': `import React, { useState, useMemo, useRef } from 'react';
import { Transaction, BalanceStatus, Expenses } from '../types';
import { formatCurrency, formatDate, calculateTransaction, toArabicNumerals, getArabicDayName } from '../utils';
import { Trash2, Edit, Check, ChevronUp } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onCashUpdate: (id: string, value: number) => void;
  onQuickAdd: (transaction: Transaction) => void;
  onSettlementDateUpdate: (id: string, date: string) => void;
}

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

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  const visibleTransactions = useMemo(() => {
    if (transactions.length <= visibleCount) return transactions;
    return transactions.slice(transactions.length - visibleCount);
  }, [transactions, visibleCount]);

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
    transactions.forEach(t => {
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
  }, [transactions]);

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

  const renderBalanceCell = (amount: number, status: string | BalanceStatus, isHeader = false) => {
      let colorClass = "bg-slate-100 text-slate-600"; 
      let label = "خالص";
      if (amount > 0) {
        colorClass = "bg-yellow-100 text-yellow-900 font-bold border-yellow-300";
        label = "له";
      } else if (amount < 0) {
        colorClass = "bg-red-100 text-red-900 font-bold border-red-300";
        label = "عليه";
      } else {
         colorClass = "bg-green-100 text-green-900 font-bold border-green-300";
      }
      return (
        <div className={\`px-1 py-1 rounded border text-center flex flex-col items-center justify-center w-full h-full \${colorClass}\`}>
          <span className="text-base font-black leading-none">{formatCurrency(Math.abs(amount))}</span>
          <span className="text-[10px] opacity-80">{label}</span>
        </div>
      );
  };

  // Compact input style
  const inputStyle = "w-full text-base px-1 py-1 border border-slate-300 rounded bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400 text-center";
  
  // Compact cell class
  const cellClass = "px-1 py-2 whitespace-normal break-words text-center";
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
              <th className="px-1 py-2 w-16 text-center">اليوم</th>
              <th className="px-1 py-2 w-20 text-center">التاريخ</th>
              <th className="px-1 py-2 w-24 text-center">السائق</th>
              <th className="px-1 py-2 w-16 text-center">السيارة</th>
              <th className="px-1 py-2 w-16 text-center">المشرف</th>
              <th className="px-1 py-2 w-12 text-center">الفروع</th>
              <th className="px-1 py-2 w-16 text-center">الخط</th>
              <th className="px-1 py-2 w-20 text-center text-blue-800 bg-blue-50/50">العهدة</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">كارتة</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">ميزان</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">سولار</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">اكرامية</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">مصالحة</th>
              <th className="px-0.5 py-2 w-12 text-center text-slate-600 bg-slate-50">صيانة</th>
              <th className="px-1 py-2 w-20 text-center font-bold text-slate-900 bg-slate-50">المصاريف</th>
              <th className="px-1 py-2 w-16 text-center text-green-800 bg-green-50/50">نقدي</th>
              <th className="px-1 py-2 w-20 text-center text-slate-700 bg-slate-50 text-xs">ت. التسوية</th>
              <th className="px-1 py-2 w-20 text-center font-bold bg-slate-50">الصافي</th>
              <th className="px-1 py-2 w-20 text-center font-bold text-indigo-800 bg-indigo-50/50">تراكمي</th>
              <th className="px-1 py-2 w-32 text-center bg-slate-50">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-base">
             {transactions.length > visibleCount && (
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
                               <div className="flex flex-col items-center"><span className="text-[10px] text-slate-400">يدوي</span><input type="number" value={dailyManualInputs[dateKey] || ''} onChange={(e) => setDailyManualInputs(prev => ({...prev, [dateKey]: e.target.value}))} className="w-16 px-1 py-0 text-center text-slate-900 rounded font-bold bg-white text-sm" placeholder="0" /></div>
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