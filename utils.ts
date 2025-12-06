import { Transaction, BalanceStatus, Expenses } from './types';

export const calculateTransaction = (
  base: Omit<Transaction, 'id' | 'totalExpenses' | 'netBalance' | 'status' | 'cumulativeBalance'> & { id?: string }
): Transaction => {
  const { custodyAmount, expenses, cashRepayment } = base;
  
  const totalExpenses = 
    (Number(expenses.maintenance) || 0) +
    (Number(expenses.trafficFines) || 0) +
    (Number(expenses.tips) || 0) +
    (Number(expenses.fuel) || 0) +
    (Number(expenses.scale) || 0) +
    (Number(expenses.roadTolls) || 0);

  // Net Balance Logic:
  // (Expenses + Cash Returned by Driver) - Custody Given
  const netBalance = (totalExpenses + (Number(cashRepayment) || 0)) - custodyAmount; 

  let status: BalanceStatus = BalanceStatus.BALANCED;
  if (netBalance > 0) status = BalanceStatus.CREDIT; // Yellow (Leh)
  if (netBalance < 0) status = BalanceStatus.DEBIT;  // Red (Alayh)

  return {
    ...base,
    id: base.id || Date.now().toString(36) + Math.random().toString(36).substr(2),
    totalExpenses,
    netBalance,
    status
  };
};

// Calculates the running total for each driver based on date
export const calculateCumulativeBalances = (transactions: Transaction[]): Transaction[] => {
  // 1. Sort Oldest -> Newest (Ascending)
  // We use a stable sort: if dates are equal, we rely on the original array order (insertion order)
  const sorted = [...transactions].sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    return d1 - d2;
  });

  const driverBalances: Record<string, number> = {};

  const processed = sorted.map(t => {
    // Normalize driver name to avoid case/space issues
    const driverKey = t.driverName.trim();
    
    // Get previous balance (default 0)
    const currentRunning = (driverBalances[driverKey] || 0) + t.netBalance;
    
    // Update map
    driverBalances[driverKey] = currentRunning;

    return {
      ...t,
      cumulativeBalance: currentRunning
    };
  });

  return processed;
};

// Helper to convert Western Arabic numerals (0-9) to Eastern Arabic numerals (٠-٩)
export const toArabicNumerals = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '';
  const str = num.toString();
  return str.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
};

export const formatCurrency = (amount: number) => {
  // Format as number first, then convert digits
  const val = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  
  return toArabicNumerals(val);
};

export const formatDate = (dateStr: string | Date) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const year = toArabicNumerals(d.getFullYear());
  const month = toArabicNumerals(d.getMonth() + 1);
  const day = toArabicNumerals(d.getDate());
  return `${year}/${month}/${day}`;
};

export const getArabicDayName = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const d = new Date(dateStr);
  return days[d.getDay()];
};