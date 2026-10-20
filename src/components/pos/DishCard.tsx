import React from 'react';
import { Plus, Minus, Star, UtensilsCrossed } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPaise } from '../../utils/currency';

interface DishCardProps {
  item: MenuItem;
  currentQty: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export const DishCard: React.FC<DishCardProps> = ({
  item,
  currentQty,
  onAdd,
  onIncrement,
  onDecrement,
}) => {
  return (
    <div className="group bg-white dark:bg-[#121824] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/40 transition-all duration-200 flex flex-col justify-between">
      {/* Dish Image and Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400 dark:text-slate-500">
            <UtensilsCrossed className="w-9 h-9 opacity-40 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-[10px] font-bold tracking-wider uppercase mt-1 opacity-50">No Photo</span>
          </div>
        )}

        {/* Veg / Non-Veg Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <div
            className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
              item.foodType === 'veg'
                ? 'border-emerald-600'
                : 'border-red-600'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                item.foodType === 'veg' ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            />
          </div>
        </div>

        {/* Bestseller Badge */}
        {item.isBestseller && (
          <div className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>Bestseller</span>
          </div>
        )}
      </div>

      {/* Dish Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {item.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
              {formatPaise(item.basePricePaise)}
            </span>
          </div>

          {currentQty === 0 ? (
            <button
              onClick={onAdd}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-900/30 dark:hover:bg-blue-600 dark:text-blue-400 dark:hover:text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          ) : (
            <div className="flex items-center bg-blue-600 text-white rounded-xl overflow-hidden shadow-sm shadow-blue-500/20">
              <button
                onClick={onDecrement}
                className="w-7 h-7 flex items-center justify-center hover:bg-blue-700 transition-colors active:scale-90"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold">{currentQty}</span>
              <button
                onClick={onIncrement}
                className="w-7 h-7 flex items-center justify-center hover:bg-blue-700 transition-colors active:scale-90"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
