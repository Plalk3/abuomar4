import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, subValue }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between border border-slate-100 hover:shadow-md transition-shadow">
      <div>
        <p className="text-base font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
        {subValue && <p className="text-sm text-slate-400 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-full ${colorClass}`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  );
};

export default StatCard;