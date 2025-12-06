export interface Expenses {
  maintenance: number; // صيانة
  trafficFines: number; // مصالحة مرورية
  tips: number; // اكرامية
  fuel: number; // سولار
  scale: number; // ميزان
  roadTolls: number; // كارتة طريق
}

export interface Transaction {
  id: string;
  date: string;
  driverName: string;
  vehicleNumber: string;
  supervisor: string; // المشرف
  branchesCount: number; // عدد فروع الرحلة
  route: string; // خط السير / فروع الرحلة
  custodyAmount: number; // العهدة (المبلغ المستلم)
  cashRepayment: number; // نقدي (توريد)
  settlementDate?: string; // تاريخ التسوية
  expenses: Expenses;
  totalExpenses: number; // اجمالي المصاريف
  netBalance: number; // صافي الحساب (الفرق)
  cumulativeBalance?: number; // اجمالي الرصيد التراكمي (الحالي + ما سبق)
  status: 'CREDIT' | 'DEBIT' | 'BALANCED'; // له | عليه | خالص
  notes?: string;
}

export enum BalanceStatus {
  CREDIT = 'CREDIT', // Driver is owed money (Yellow)
  DEBIT = 'DEBIT',   // Driver owes money (Red)
  BALANCED = 'BALANCED' // Equal (Green)
}

// Order matches the visual requirement: Tolls -> Scale -> Fuel -> Tips -> Fines -> Maintenance
export const EXCEL_HEADERS = [
  "اليوم",
  "التاريخ",
  "اسم السائق",
  "رقم السيارة",
  "المشرف",
  "عدد الفروع",
  "خط السير",
  "العهدة",
  "كارتة طريق",
  "ميزان",
  "سولار",
  "اكرامية",
  "مصالحة مرورية",
  "صيانة",
  "اجمالي المصاريف",
  "نقدي (توريد)",
  "تاريخ التسوية",
  "صافي الحساب",
  "إجمالي الرصيد (تراكمي)",
  "ملاحظات"
];