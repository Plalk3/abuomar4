import React, { useState, useMemo, useEffect } from 'react';
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
import AIAssistant from './components/AIAssistant';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { Transaction, EXCEL_HEADERS } from './types';
import { calculateTransaction, calculateCumulativeBalances, formatCurrency, getArabicDayName } from './utils';

// Initial Data cleared as requested
const INITIAL_DATA_RAW: any[] = [];

const INITIAL_DATA = INITIAL_DATA_RAW.map((d, i) => calculateTransaction({
  ...d,
  id: `init-${i}`,
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
    link.download = `abu_omar_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        (t.driverName || '').toLowerCase().includes(q) ||
        String(t.vehicleNumber || '').includes(q) ||
        (t.route || '').includes(q) ||
        (t.supervisor || '').includes(q)
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

      <AIAssistant transactions={transactions} />

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

export default App;