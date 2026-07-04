/**
 * BuyerHistoryDrawer — mirrors MerchantProfileDrawer for Factory buyers.
 *
 * Props:
 *   buyerName   – string  — filters all factory records by this buyer name
 *   allItems    – array   — all loaded factory items (passed from parent to avoid re-fetch)
 *   onClose     – fn()
 *   onPaymentClick – fn(item) — opens PaymentModal for a specific record
 *   onDataChange   – fn()   — parent re-fetch after payment changes
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { factoryAPI } from '../../api/factoryApi';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtN = (n) => parseFloat(n || 0).toFixed(2);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function calcVirtuals(totalQuantity, lessPercentage, rate, advance, payments) {
  const tq  = parseFloat(totalQuantity)  || 0;
  const lp  = parseFloat(lessPercentage) || 0;
  const r   = parseFloat(rate)           || 0;
  const adv = parseFloat(advance)        || 0;
  const lq  = parseFloat(((tq * lp) / 100).toFixed(2));
  const nq  = parseFloat((tq - lq).toFixed(2));
  const ta  = parseFloat((nq * r).toFixed(2));
  const paid = (payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const due  = parseFloat((ta - adv - paid).toFixed(2));
  return { lessQty: lq, netQty: nq, totalAmount: ta, totalPaid: paid, due };
}

// ── Single Sale Record Card (expandable) ─────────────────────────────────────
function SaleCard({ item, index, onPaymentClick, onDataChange }) {
  const [open, setOpen] = useState(false);
  const v = calcVirtuals(item.totalQuantity, item.lessPercentage, item.rate, item.advance, item.payments);
  const isFullyPaid = v.due <= 0;

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      open ? 'border-secondary/30 shadow-md shadow-secondary/5' : 'border-outline-variant/20 hover:border-secondary/20'
    } bg-surface`}>

      {/* Card header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
            ${index === 0 ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-on-surface text-sm">{fmtDate(item.date)}</span>
              {item.remarks && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                  {item.remarks}
                </span>
              )}
              {isFullyPaid ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                  ✓ Clear
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">
                  ₹{fmt(v.due)} Due
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          <div className="text-right">
            <p className="text-xs text-on-surface-variant">Net Qty</p>
            <p className="font-bold text-on-surface text-sm">{fmtN(v.netQty)} kg</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant">Total Amt</p>
            <p className="font-bold text-secondary text-sm">₹{fmt(v.totalAmount)}</p>
          </div>
          <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-outline-variant/20 p-4 space-y-4">
          {/* Qty & Finance grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container-low/50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-secondary">grass</span>
                Quantity
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total Qty</span>
                  <span className="font-medium">{fmtN(item.totalQuantity)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Less ({fmtN(item.lessPercentage)}%)</span>
                  <span className="font-medium text-error">− {fmtN(v.lessQty)} kg</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/20 pt-1.5">
                  <span className="font-semibold">Net Qty</span>
                  <span className="font-bold text-secondary">{fmtN(v.netQty)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Rate / kg</span>
                  <span className="font-medium">₹{fmt(item.rate)}</span>
                </div>
                {item.fineLeaf > 0 && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Fine Leaf %</span>
                    <span className="font-medium">{fmtN(item.fineLeaf)}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low/50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-secondary">calculate</span>
                Financials
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total Amount</span>
                  <span className="font-medium">₹{fmt(v.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Advance</span>
                  <span className="font-medium text-error">− ₹{fmt(item.advance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Paid</span>
                  <span className="font-medium text-green-600">− ₹{fmt(v.totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/20 pt-1.5">
                  <span className="font-semibold">Balance</span>
                  <span className={`font-bold ${isFullyPaid ? 'text-green-600' : 'text-red-500'}`}>
                    {isFullyPaid ? '✓ Clear' : `₹${fmt(v.due)} Due`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment history */}
          {item.payments && item.payments.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-secondary">receipt_long</span>
                Payment History ({item.payments.length})
              </p>
              <div className="space-y-2">
                {item.payments.map((pay, idx) => (
                  <div key={pay._id || idx}
                    className="flex items-center justify-between bg-surface-container-low/50 rounded-xl px-4 py-2.5 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                        ${idx === 0 ? 'bg-secondary/15 text-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">{fmtDate(pay.date)}</p>
                        <p className="text-xs text-on-surface-variant">{pay.mode}</p>
                      </div>
                    </div>
                    <p className="font-bold text-secondary text-sm">₹{fmt(pay.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {!isFullyPaid && (
              <button
                onClick={() => onPaymentClick(item)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-secondary/90 to-secondary text-white rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Record Payment (₹{fmt(v.due)} remaining)
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const url = await factoryAPI.getInvoiceBlob(item._id);
                  window.open(url, '_blank');
                } catch {
                  toast.error('Failed to generate invoice');
                }
              }}
              className={`${isFullyPaid ? 'flex-1' : ''} flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-all active:scale-[0.98]`}
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Download Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function BuyerHistoryDrawer({ buyerName, onClose, onPaymentClick, onDataChange }) {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await factoryAPI.getAll({ search: buyerName, limit: 500 });
      const filtered = (data.data || []).filter(r =>
        r.buyerName.toLowerCase() === buyerName.toLowerCase()
      ).sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(filtered);
    } catch {
      toast.error('Failed to load buyer history');
    }
    setLoading(false);
  }, [buyerName]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePaymentClick = (item) => {
    onClose();           // close drawer first
    onPaymentClick(item); // open payment modal in parent
  };

  const handleDataChange = () => {
    load();
    onDataChange();
  };

  // Aggregate summary
  const summary = records.reduce((acc, r) => {
    const v = calcVirtuals(r.totalQuantity, r.lessPercentage, r.rate, r.advance, r.payments);
    return {
      totalNetQty:   acc.totalNetQty   + v.netQty,
      totalAmount:   acc.totalAmount   + v.totalAmount,
      totalPaid:     acc.totalPaid     + v.totalPaid,
      totalDue:      acc.totalDue      + (v.due > 0 ? v.due : 0),
    };
  }, { totalNetQty: 0, totalAmount: 0, totalPaid: 0, totalDue: 0 });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Drawer panel */}
      <div className="h-full w-full max-w-2xl bg-surface flex flex-col shadow-2xl overflow-hidden animate-slide-in-right">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 bg-surface-container-low/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl">storefront</span>
              <h2 className="font-headline text-xl font-bold text-secondary">{buyerName}</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {records.length} sale record{records.length !== 1 ? 's' : ''} · All time history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const url = await factoryAPI.getInvoiceBlobByBuyer(buyerName);
                  window.open(url, '_blank');
                } catch {
                  toast.error('Failed to generate statement');
                }
              }}
              className="px-4 py-2 border-2 border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-all active:scale-[0.98] flex items-center gap-2"
              title="Download Statement"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              Download Statement
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        </div>

        {/* ── Summary bar ── */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-outline-variant/20 shrink-0">
            {[
              { label: 'Net Qty',      value: `${fmtN(summary.totalNetQty)} kg`,  icon: 'grass' },
              { label: 'Total Amt',    value: `₹${fmt(summary.totalAmount)}`,     icon: 'payments' },
              { label: 'Received',     value: `₹${fmt(summary.totalPaid)}`,       icon: 'check_circle' },
              { label: 'Outstanding',  value: `₹${fmt(summary.totalDue)}`,        icon: 'account_balance_wallet', highlight: summary.totalDue > 0 },
            ].map((s) => (
              <div key={s.label} className="flex flex-col px-4 py-3 border-r border-outline-variant/10 last:border-r-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-sm text-secondary/60">{s.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{s.label}</span>
                </div>
                <span className={`font-headline font-bold text-base ${s.highlight ? 'text-red-600' : 'text-on-surface'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Record list ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-secondary text-4xl">progress_activity</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">storefront</span>
              <p className="text-sm">No sale records found for this buyer.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant px-1">
                Tap a record to see details &amp; payment history
              </p>
              {records.map((item, index) => (
                <SaleCard
                  key={item._id}
                  item={item}
                  index={index}
                  onPaymentClick={handlePaymentClick}
                  onDataChange={handleDataChange}
                />
              ))}
            </>
          )}
        </div>

        <div className="h-4 shrink-0" />
      </div>
    </div>,
    document.body
  );
}
