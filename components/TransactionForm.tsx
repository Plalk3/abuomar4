import React, { useState, useEffect } from 'react';
import { PlusCircle, X, Save, Edit } from 'lucide-react';
import { Transaction, Expenses } from '../types';
import { calculateTransaction } from '../utils';

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSave: (transaction: Transaction) => void;
  onClose: () => void;
}

const InputGroup = ({ label, value, onChange, type = "number", placeholder = "0" }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-base font-bold text-slate-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
    />
  </div>
);

const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    vehicleNumber: '',
    supervisor: '',
    branchesCount: '',
    route: '',
    custodyAmount: '',
    cashRepayment: '',
    notes: '',
  });

  const [expenses, setExpenses] = useState<Expenses>({
    maintenance: 0,
    trafficFines: 0,
    tips: 0,
    fuel: 0,
    scale: 0,
    roadTolls: 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        date: initialData.date.split('T')[0],
        driverName: initialData.driverName,
        vehicleNumber: initialData.vehicleNumber,
        supervisor: initialData.supervisor,
        branchesCount: initialData.branchesCount.toString(),
        route: initialData.route,
        custodyAmount: initialData.custodyAmount.toString(),
        cashRepayment: initialData.cashRepayment ? initialData.cashRepayment.toString() : '',
        notes: initialData.notes || '',
      });
      setExpenses(initialData.expenses);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalExpenses = Number(expenses.fuel) + Number(expenses.roadTolls) + Number(expenses.scale) + Number(expenses.maintenance) + Number(expenses.tips) + Number(expenses.trafficFines);
    const custody = Number(formData.custodyAmount) || 0;
    const cash = Number(formData.cashRepayment) || 0;
    const netBalance = (totalExpenses + cash) - custody;
    let settlementDate = initialData?.settlementDate;
    if (netBalance === 0) {
        settlementDate = formData.date;
    }

    const transaction = calculateTransaction({
      id: formData.id || undefined,
      date: formData.date,
      driverName: formData.driverName,
      vehicleNumber: formData.vehicleNumber,
      supervisor: formData.supervisor,
      branchesCount: Number(formData.branchesCount) || 0,
      route: formData.route,
      custodyAmount: Number(formData.custodyAmount) || 0,
      cashRepayment: Number(formData.cashRepayment) || 0,
      settlementDate: settlementDate,
      expenses: {
        maintenance: Number(expenses.maintenance),
        trafficFines: Number(expenses.trafficFines),
        tips: Number(expenses.tips),
        fuel: Number(expenses.fuel),
        scale: Number(expenses.scale),
        roadTolls: Number(expenses.roadTolls),
      },
      notes: formData.notes
    });
    onSave(transaction);
    onClose();
  };

  const handleExpenseChange = (key: keyof Expenses, value: string) => setExpenses(prev => ({ ...prev, [key]: value }));
  const val = (v: any) => (v === 0 || v === '0') ? '' : v;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            {initialData ? <Edit className="w-8 h-8 text-blue-600" /> : <PlusCircle className="w-8 h-8 text-blue-600" />}
            {initialData ? 'تعديل الحركة' : 'تسجيل حركة جديدة'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-8 h-8 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-800 mb-4 pb-2 border-b border-blue-100">بيانات الرحلة الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InputGroup label="التاريخ" type="date" value={formData.date} onChange={(e: any) => setFormData({...formData, date: e.target.value})} />
              <InputGroup label="اسم السائق" type="text" placeholder="مثال: محمود ربيع" value={formData.driverName} onChange={(e: any) => setFormData({...formData, driverName: e.target.value})} />
              <InputGroup label="رقم السيارة" type="text" placeholder="مثال: 4129" value={formData.vehicleNumber} onChange={(e: any) => setFormData({...formData, vehicleNumber: e.target.value})} />
              <InputGroup label="المشرف" type="text" placeholder="مثال: محي" value={formData.supervisor} onChange={(e: any) => setFormData({...formData, supervisor: e.target.value})} />
              <InputGroup label="عدد الفروع" type="number" placeholder="مثال: 9" value={val(formData.branchesCount)} onChange={(e: any) => setFormData({...formData, branchesCount: e.target.value})} />
              <InputGroup label="خط السير" type="text" placeholder="مثال: أسوان" value={formData.route} onChange={(e: any) => setFormData({...formData, route: e.target.value})} />
              <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-6">
                 <InputGroup label="العهدة (المبلغ المستلم)" placeholder="0" value={val(formData.custodyAmount)} onChange={(e: any) => setFormData({...formData, custodyAmount: e.target.value})} />
                 <InputGroup label="نقدي (تم توريده)" placeholder="0" value={val(formData.cashRepayment)} onChange={(e: any) => setFormData({...formData, cashRepayment: e.target.value})} />
              </div>
            </div>
          </div>
          <div className="bg-orange-50/50 p-6 rounded-xl border border-orange-100">
            <h3 className="text-lg font-bold text-orange-800 mb-4 pb-2 border-b border-orange-100">تفاصيل المصاريف (الفواتير)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <InputGroup label="كارتة طريق" value={val(expenses.roadTolls)} onChange={(e: any) => handleExpenseChange('roadTolls', e.target.value)} />
              <InputGroup label="ميزان" value={val(expenses.scale)} onChange={(e: any) => handleExpenseChange('scale', e.target.value)} />
              <InputGroup label="سولار (وقود)" value={val(expenses.fuel)} onChange={(e: any) => handleExpenseChange('fuel', e.target.value)} />
               <InputGroup label="اكرامية" value={val(expenses.tips)} onChange={(e: any) => handleExpenseChange('tips', e.target.value)} />
              <InputGroup label="مصالحة مرورية" value={val(expenses.trafficFines)} onChange={(e: any) => handleExpenseChange('trafficFines', e.target.value)} />
              <InputGroup label="صيانة" value={val(expenses.maintenance)} onChange={(e: any) => handleExpenseChange('maintenance', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-base font-bold text-slate-700">ملاحظات إضافية</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"></textarea>
          </div>
          <div className="pt-4 border-t flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-8 py-3 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors text-lg">إلغاء</button>
            <button type="submit" className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200 text-lg"><Save className="w-6 h-6" />{initialData ? 'حفظ التعديلات' : 'حفظ البيانات'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TransactionForm;