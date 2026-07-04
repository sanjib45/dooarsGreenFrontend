/**
 * CustomDateRangeModal — modal for picking a custom start/end date range.
 *
 * Props:
 *  isOpen      – boolean
 *  tempDates   – { start: string, end: string }
 *  onChange    – ({ start, end }) => void
 *  onApply     – () => void  (applies tempDates as real filter)
 *  onReset     – () => void  (clears tempDates + closes)
 *  onCancel    – () => void  (closes without applying)
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function CustomDateRangeModal({ isOpen, tempDates, onChange, onApply, onReset, onCancel }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-outline-variant/20">
          <h3 className="text-lg font-bold text-on-surface">Select Entry Date Range</h3>
        </div>

        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              From
            </label>
            <input
              id="custom-date-start"
              type="date"
              value={tempDates.start}
              onChange={(e) => onChange({ ...tempDates, start: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:border-primary text-sm focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              To
            </label>
            <input
              id="custom-date-end"
              type="date"
              value={tempDates.end}
              min={tempDates.start || undefined}
              onChange={(e) => onChange({ ...tempDates, end: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:border-primary text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="p-4 bg-surface-container-low/50 flex justify-end gap-3 border-t border-outline-variant/20">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-sm font-semibold text-error hover:bg-error/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReset}
            className="px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            disabled={!tempDates.start || !tempDates.end}
            className="px-6 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
