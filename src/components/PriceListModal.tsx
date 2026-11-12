import React, { useState } from 'react';
import { PriceListItem } from '../types.js';
import { formatCurrency, getCategoryIcon, getCategoryBadgeClass } from '../utils.js';
import { BookOpen, X, Search } from 'lucide-react';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceList: PriceListItem[];
}

export const PriceListModal: React.FC<PriceListModalProps> = ({
  isOpen,
  onClose,
  priceList,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = priceList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#0070BA] text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hospital Charge Master</h3>
              <p className="text-[11px] text-slate-500">
                Standard institutional pricing for 25 inpatient catalogue items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, medications, bed types..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070BA]/20"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="p-6 overflow-y-auto divide-y divide-slate-100 text-xs">
          {filtered.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                    <span className="font-bold text-slate-900">{item.name}</span>
                  </div>
                  {item.description && (
                    <p className="text-slate-500 text-[11px] mt-1">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-[#0070BA] shrink-0">
                {formatCurrency(item.unitPrice)}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No hospital items match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
