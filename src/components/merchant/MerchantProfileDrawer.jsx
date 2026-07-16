/**
 * MerchantProfileDrawer
 * ─────────────────────────────────────────────────────────────────────────────
 * When the user clicks "View Details" on ANY row for a merchant, this drawer
 * slides in from the right and shows:
 *
 *  1. Merchant-level summary (total qty, total gross amount, outstanding balance)
 *  2. Invoice Download section — pick a date, preview invoice, download PDF
 *  3. All transactions for that merchant, sorted newest-first
 *  4. Each transaction card is expandable → shows quantity/financial breakdown
 *     + inline payment history + "Record Payment" form
 *
 * Props:
 *   merchantName  – string  — filters all transactions by this name
 *   onClose       – fn()   — called when drawer is closed
 *   onDataChange  – fn()   — called after any payment add/delete (so parent
 *                            can refresh the table and stats)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { merchantTxnAPI } from '../../api/merchantTransactionApi';
import { merchantMasterAPI } from '../../api/merchantMasterApi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal';
import { localYmd, localDatetimeValue, toApiDate } from '../../utils/date';



// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'];

const ADVANCE_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'];

// ── Advance Payment Section ───────────────────────────────────────────────────
function AdvanceSection({ merchantProfile, merchantName, onDataChange, onAdvancesLoaded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [totalAdvance, setTotalAdvance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    advanceDate: localDatetimeValue(),
    paymentMode: 'Cash',
    notes: '',
  });

  const merchantId = merchantProfile?._id;
  // Keep callback in a ref so loadAdvances stays stable and does not re-fetch on every parent render
  const onAdvancesLoadedRef = useRef(onAdvancesLoaded);
  onAdvancesLoadedRef.current = onAdvancesLoaded;

  const loadAdvances = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const { data: res } = await merchantMasterAPI.getAdvances(merchantId);
      setAdvances(res.data.advances);
      setTotalAdvance(res.data.totalAdvance);
      onAdvancesLoadedRef.current?.(res.data.totalAdvance);
    } catch {
      toast.error('Failed to load advances');
    }
    setLoading(false);
  }, [merchantId]);

  useEffect(() => { loadAdvances(); }, [loadAdvances]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalMerchantId = merchantId;
    if (!finalMerchantId) {
      return toast.error('Link this merchant with a real phone first (use the Merchant form autocomplete). Placeholder phones are blocked.');
    }
    setSubmitting(true);
    try {
      await merchantMasterAPI.createAdvance(finalMerchantId, {
        ...form,
        advanceDate: toApiDate(form.advanceDate),
      });
      toast.success('Advance recorded!');
      setForm({
        amount: '',
        advanceDate: localDatetimeValue(),
        paymentMode: 'Cash',
        notes: '',
      });
      setShowForm(false);
      await loadAdvances();
      onDataChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record advance');
    }
    setSubmitting(false);
  };

  const handleDelete = async (advanceId) => {
    if (!merchantId) return;
    try {
      await merchantMasterAPI.deleteAdvance(merchantId, advanceId);
      toast.success('Advance deleted');
      await loadAdvances();
      onDataChange();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="border-b border-outline-variant/20 shrink-0">
      {/* Header bar — clickable to collapse */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-amber-50/50 cursor-pointer hover:bg-amber-100/50 transition-colors"
        onClick={() => setIsOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[18px]">currency_rupee</span>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Advance Payments to Farmer</span>
          {totalAdvance > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">
              Total: ₹{fmt(totalAdvance)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm(v => !v); if (!isOpen) setIsOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Add Advance'}
          </button>
          <span className={`material-symbols-outlined text-amber-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Collapsible body */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Add Advance Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="px-4 py-3 bg-amber-50/30 border-b border-amber-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Amount (₹) *</label>
              <input
                type="number" step="0.01" min="1" required
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Date & Time *</label>
              <input
                type="datetime-local" required
                value={form.advanceDate}
                onChange={e => setForm(p => ({ ...p, advanceDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Mode</label>
              <select
                value={form.paymentMode}
                onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-amber-500 transition-all"
              >
                {ADVANCE_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optional note"
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>
          <button
            type="submit" disabled={submitting}
            className="px-6 py-2 bg-amber-600 text-white rounded-full text-xs font-semibold hover:bg-amber-700 transition-all disabled:opacity-60 flex items-center gap-1.5"
          >
            {submitting
              ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              : <span className="material-symbols-outlined text-sm">save</span>}
            {submitting ? 'Saving…' : 'Record Advance'}
          </button>
        </form>
      )}

        {/* Advance list */}
        <div className="px-4 pb-3">
          {loading ? (
            <div className="flex justify-center py-3">
              <span className="material-symbols-outlined animate-spin text-amber-600 text-xl">progress_activity</span>
            </div>
          ) : advances.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic py-2">No advance payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5 pt-2">
              {advances.map(adv => (
                <div key={adv._id} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-700 text-[14px]">payments</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">₹{fmt(adv.amount)}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {fmtDate(adv.advanceDate)} · {adv.paymentMode}
                        {adv.notes && ` · ${adv.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-on-surface-variant/60">{adv.advanceId}</span>
                    <button
                      onClick={() => handleDelete(adv._id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-error transition-colors"
                      title="Delete advance"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>{/* end collapsible body */}
    </div>
  );
}

// ── Merchant Payment Section (weekly / direct payment to merchant) ─────────────
function PaymentSection({ merchantProfile, merchantName, onDataChange, onPaymentsLoaded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    paymentDate: localDatetimeValue(),
    paymentMode: 'Cash',
    notes: '',
  });

  const merchantId = merchantProfile?._id;
  // Keep callback in a ref so loadPayments stays stable and does not re-fetch on every parent render
  const onPaymentsLoadedRef = useRef(onPaymentsLoaded);
  onPaymentsLoadedRef.current = onPaymentsLoaded;

  const loadPayments = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const { data: res } = await merchantMasterAPI.getPayments(merchantId);
      setPayments(res.data.payments);
      setTotalPaid(res.data.totalPaid);
      onPaymentsLoadedRef.current?.(res.data.totalPaid);
    } catch {
      toast.error('Failed to load payments');
    }
    setLoading(false);
  }, [merchantId]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalMerchantId = merchantId;
    if (!finalMerchantId) {
      return toast.error('Link this merchant with a real phone first (use the Merchant form autocomplete). Placeholder phones are blocked.');
    }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Amount must be greater than 0');
    setSubmitting(true);
    try {
      await merchantMasterAPI.createPayment(finalMerchantId, {
        ...form,
        paymentDate: toApiDate(form.paymentDate),
      });
      toast.success('Payment recorded!');
      setForm({
        amount: '',
        paymentDate: localDatetimeValue(),
        paymentMode: 'Cash',
        notes: '',
      });
      setShowForm(false);
      await loadPayments();
      onDataChange();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
    setSubmitting(false);
  };

  const handleDelete = async (payId) => {
    if (!merchantId) return;
    try {
      await merchantMasterAPI.deletePayment(merchantId, payId);
      toast.success('Payment deleted');
      await loadPayments();
      onDataChange();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="border-b border-outline-variant/20 shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-green-50/50 cursor-pointer hover:bg-green-100/50 transition-colors"
        onClick={() => setIsOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-green-700 text-[18px]">payments</span>
          <span className="text-xs font-bold uppercase tracking-wider text-green-900">Payments to Merchant</span>
          {totalPaid > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-200 text-green-900">
              Total: ₹{fmt(totalPaid)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm(v => !v); if (!isOpen) setIsOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Add Payment'}
          </button>
          <span className={`material-symbols-outlined text-green-700 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Collapsible body */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Add Payment Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="px-4 py-3 bg-green-50/30 border-b border-green-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Amount (₹) *</label>
                <input
                  type="number" step="0.01" min="1" required
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-green-600 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Date &amp; Time *</label>
                <input
                  type="datetime-local" required
                  value={form.paymentDate}
                  onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-green-600 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Payment Mode</label>
                <select
                  value={form.paymentMode}
                  onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-green-600 transition-all"
                >
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional note"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-green-600 transition-all"
                />
              </div>
            </div>
            <button
              type="submit" disabled={submitting}
              className="px-6 py-2 bg-green-700 text-white rounded-full text-xs font-semibold hover:bg-green-800 transition-all disabled:opacity-60 flex items-center gap-1.5"
            >
              {submitting
                ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                : <span className="material-symbols-outlined text-sm">save</span>}
              {submitting ? 'Saving…' : 'Record Payment'}
            </button>
          </form>
        )}

        {/* Payment list */}
        <div className="px-4 pb-3">
          {loading ? (
            <div className="flex justify-center py-3">
              <span className="material-symbols-outlined animate-spin text-green-700 text-xl">progress_activity</span>
            </div>
          ) : payments.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic py-2">No payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5 pt-2">
              {payments.map(pay => (
                <div key={pay._id} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-700 text-[14px]">payments</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">₹{fmt(pay.amount)}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {fmtDate(pay.paymentDate)} · {pay.paymentMode}
                        {pay.notes && ` · ${pay.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-on-surface-variant/60">{pay.paymentId}</span>
                    <button
                      onClick={() => handleDelete(pay._id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-error transition-colors"
                      title="Delete payment"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>{/* end collapsible body */}
    </div>
  );
}

// ── Invoice Download Section ──────────────────────────────────────────────────
function InvoiceSection({ merchantName }) {
  const [isOpen, setIsOpen] = useState(false);
  const today = localYmd();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [checking, setChecking]   = useState(false);
  const [txnCount, setTxnCount]         = useState(null);   // null = unchecked
  const [noData, setNoData]             = useState(false);
  const [previewing, setPreviewing]     = useState(false);
  const [previewHtml, setPreviewHtml]   = useState('');
  const [downloading, setDownloading]   = useState(false);
  const iframeRef = useRef(null);

  // Whenever date changes reset state
  useEffect(() => {
    setTxnCount(null);
    setNoData(false);
  }, [startDate, endDate]);

  // ── Check how many transactions exist for that date ───────────────────────
  const handleCheck = async () => {
    setChecking(true);
    setNoData(false);
    setTxnCount(null);
    try {
      const { data: res } = await merchantTxnAPI.getAll({
        merchantName,
        startDate,
        endDate,
        limit:     500,
      });
      if (!res.data || res.data.length === 0) {
        setNoData(true);
      } else {
        setTxnCount(res.data.length);
      }
    } catch {
      toast.error('Failed to check transactions');
    }
    setChecking(false);
  };

  // ── Preview: fetch HTML from backend and show in iframe modal ─────────────
  const handlePreview = async () => {
    try {
      const { data: html } = await merchantTxnAPI.getInvoiceHtmlByDate(merchantName, startDate, endDate);
      setPreviewHtml(html);
      setPreviewing(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Preview failed';
      toast.error(msg);
    }
  };

  // Write HTML into iframe once it mounts
  useEffect(() => {
    if (previewing && iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewing, previewHtml]);

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Use the central Axios client for auth + timeout
      const res = await import('../../api/client').then(m =>
        m.default.get('/merchant-transactions/invoice/by-merchant-date', {
          params: { merchantName, startDate, endDate },
          responseType: 'blob',
        })
      );
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      const safeStart = startDate.replace(/-/g,'');
      const safeEnd   = endDate.replace(/-/g,'');
      const dateStr   = startDate === endDate ? safeStart : `${safeStart}_${safeEnd}`;
      a.download = `invoice-${merchantName.replace(/\s+/g,'_')}-${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
      
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Download failed');
    }
    setDownloading(false);
  };

  return (
    <>
      {/* ── Section card ── */}
      <div className="mx-4 mb-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
        {/* Header (Clickable for toggle) */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
            <p className="text-sm font-bold text-primary uppercase tracking-wider">
              Download Invoice
            </p>
          </div>
          <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>

        {/* Expandable Body */}
        <div 
          className={`px-4 space-y-3 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0 pb-0'}`}
        >
          <p className="text-xs text-on-surface-variant">
            Select a date range to generate a payment voucher for all transactions within that period.
          </p>

          {/* Date picker + check row */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                max={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                max={today}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <button
              id="invoice-check-btn"
              onClick={handleCheck}
              disabled={checking}
              className="px-4 py-2 rounded-xl border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap"
            >
              {checking
                ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                : <span className="material-symbols-outlined text-sm">search</span>}
              Check Entries
            </button>
          </div>

          {/* Result feedback */}
          {noData && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700">
              <span className="material-symbols-outlined text-sm">info</span>
              No transactions found for {merchantName} in this period.
            </div>
          )}

          {txnCount !== null && !noData && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>
                  Found <strong>{txnCount}</strong> transaction{txnCount !== 1 ? 's' : ''} in this period — ready to generate invoice.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  id="invoice-preview-btn"
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">preview</span>
                  Preview Invoice
                </button>
                <button
                  id="invoice-download-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-br from-secondary to-primary text-white text-xs font-semibold shadow hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
                >
                  {downloading
                    ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    : <span className="material-symbols-outlined text-sm">download</span>}
                  {downloading ? 'Generating PDF…' : 'Save as PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Preview Modal (full-screen iframe) ── */}
      {previewing && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/70 backdrop-blur-sm">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <span className="text-white font-semibold text-sm">
                Invoice Preview — {merchantName} · {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="invoice-download-from-preview-btn"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-br from-secondary to-primary text-white text-xs font-semibold shadow hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
              >
                {downloading
                  ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  : <span className="material-symbols-outlined text-sm">download</span>}
                {downloading ? 'Generating…' : 'Save PDF'}
              </button>
              <button
                onClick={() => { setPreviewing(false); setPreviewHtml(''); }}
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>
          </div>

          {/* iframe */}
          <iframe
            ref={iframeRef}
            title="Invoice Preview"
            className="flex-1 w-full bg-white"
            style={{ border: 'none' }}
          />
        </div>,
        document.body
      )}
    </>
  );
}

// ── Balance badge ─────────────────────────────────────────────────────────────
function BalanceBadge({ balance }) {
  if (balance > 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700">
        ₹{fmt(balance)} Payable
      </span>
    );
  if (balance < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">
        Adv ₹{fmt(Math.abs(balance))}
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
      ✓ Settled
    </span>
  );
}

// ── Single transaction card (expandable) ──────────────────────────────────────
function TransactionCard({ txn, index, onDataChange }) {
  const [open, setOpen] = useState(false);
  const [payData, setPayData] = useState(null);   // { payments, summary }
  const [loadingPay, setLoadingPay] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: localDatetimeValue(),
    paymentMode: 'Cash',
    notes: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePayId, setDeletePayId] = useState(null);
  const [isPaySectionOpen, setIsPaySectionOpen] = useState(false);

  // Load payments when card is expanded
  const loadPayments = useCallback(async () => {
    setLoadingPay(true);
    try {
      const { data: res } = await merchantTxnAPI.getPayments(txn._id);
      setPayData(res.data);
    } catch {
      toast.error('Failed to load payments');
    }
    setLoadingPay(false);
  }, [txn._id]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
  };

  // Add payment
  const handlePay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await merchantTxnAPI.addPayment(txn._id, {
        ...payForm,
        paymentDate: toApiDate(payForm.paymentDate),
      });
      toast.success('Payment recorded!');
      setPayForm({
        amount: '',
        paymentDate: localDatetimeValue(),
        paymentMode: 'Cash',
        notes: '',
      });
      setShowPayForm(false);
      await loadPayments();
      onDataChange();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          'Payment failed'
      );
    }
    setSubmitting(false);
  };

  // Delete payment
  const handleConfirmDelete = async () => {
    try {
      await merchantTxnAPI.deletePayment(txn._id, deletePayId);
      toast.success('Payment deleted');
      await loadPayments();
      onDataChange();
    } catch {
      toast.error('Delete failed');
    } finally {
      setShowDeleteConfirm(false);
      setDeletePayId(null);
    }
  };

  const isPaid = payData?.summary?.isPaidFull;
  const remaining = payData?.summary?.remainingBalance ?? txn.balance;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        open
          ? 'border-primary/30 shadow-md shadow-primary/5'
          : 'border-outline-variant/20 hover:border-primary/20'
      } bg-surface overflow-hidden`}
    >
      {/* ── Card Header (always visible) ── */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Index badge */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
              ${index === 0 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}
          >
            {index + 1}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-on-surface text-sm">
                {fmtDate(txn.transactionDate)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {txn.teaType}
              </span>
              <BalanceBadge balance={txn.balance} />
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
              {txn.transactionId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          <div className="text-right">
            <p className="text-xs text-on-surface-variant">Net Qty</p>
            <p className="font-bold text-on-surface text-sm">{txn.netQty} kg</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant">Final Payable</p>
            <p className="font-bold text-primary text-sm">₹{fmt(txn.finalPayable)}</p>
          </div>
          <span
            className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div className="border-t border-outline-variant/20 p-4 space-y-4">

          {/* Quantity + Financial grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Quantity breakdown */}
            <div className="bg-surface-container-low/50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">grass</span>
                Quantity
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Gross Qty</span>
                  <span className="font-medium">{txn.grossQty} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Less ({txn.lessPercent}%)</span>
                  <span className="font-medium text-error">− {txn.lessQty} kg</span>
                </div>
                {txn.fineLeaf > 0 && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Fine Leaf</span>
                    <span className="font-medium text-tertiary">{txn.fineLeaf}%</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-outline-variant/20 pt-1.5">
                  <span className="font-semibold">Net Qty</span>
                  <span className="font-bold text-primary">{txn.netQty} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Rate / kg</span>
                  <span className="font-medium">₹{txn.ratePerKg}</span>
                </div>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="bg-surface-container-low/50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">calculate</span>
                Financials
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Gross Amount</span>
                  <span className="font-medium">₹{fmt(txn.grossAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Labour ({txn.labourHeadCount ?? txn.laborCount ?? 0} × ₹{txn.labourCharge ?? txn.laborChargePerWorker ?? 0})
                  </span>
                  <span className="font-medium text-error">− ₹{fmt(txn.labourAmount || txn.totalLaborCharges || ((txn.labourHeadCount || txn.laborCount || 0) * (txn.labourCharge || txn.laborChargePerWorker || 0)))}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/20 pt-1.5">
                  <span className="font-semibold text-on-surface-variant">Net Payable</span>
                  <span className="font-semibold">₹{fmt(txn.netPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Advance</span>
                  <span className="font-medium text-error">− ₹{fmt(txn.advancePayment)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          {txn.notes && (
            <p className="text-xs text-on-surface-variant bg-surface-container/40 rounded-xl px-4 py-2.5 italic">
              📝 {txn.notes}
            </p>
          )}

          {/* ── Payment section Header (Collapsible) ── */}
          <div 
            className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 cursor-pointer hover:bg-orange-100/50 transition-colors border border-orange-100"
            onClick={() => {
              const next = !isPaySectionOpen;
              setIsPaySectionOpen(next);
              if (next && !payData) loadPayments();
            }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-[18px]">receipt_long</span>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-900">Transaction Payments</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${txn.balance <= 0 ? 'bg-green-200 text-green-900' : 'bg-orange-200 text-orange-900'}`}>
                {txn.balance <= 0 ? 'Fully Paid' : `Due: ₹${fmt(txn.balance)}`}
              </span>
            </div>
            <span className={`material-symbols-outlined text-orange-600 transition-transform duration-300 ${isPaySectionOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isPaySectionOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            {loadingPay ? (
              <div className="flex justify-center py-4">
                <span className="material-symbols-outlined animate-spin text-primary text-2xl">
                  progress_activity
                </span>
              </div>
            ) : payData ? (
              <>
                {/* Payment summary bar */}
                <div
                  className={`rounded-xl p-3 flex flex-wrap items-center gap-4 text-sm border ${
                    isPaid
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-orange-50/50 border-orange-200'
                  }`}
                >
                  <div>
                    <span className="text-on-surface-variant text-xs">Total Paid (incl. Adv)</span>
                    <p className="font-bold text-on-surface">₹{fmt(payData.summary.totalPaid + (txn.advancePayment || 0))}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-xs">Payable Balance</span>
                    <p className={`font-bold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                      ₹{fmt(payData.summary.remainingBalance)}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {isPaid ? (
                      <span className="flex items-center gap-1 text-green-600 font-semibold text-xs">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Fully Paid
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (!showPayForm) {
                            setPayForm((p) => ({
                              ...p,
                              amount: String(payData.summary.remainingBalance),
                            }));
                          }
                          setShowPayForm((v) => !v);
                        }}
                        className="px-4 py-1.5 bg-gradient-to-br from-secondary to-primary text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow hover:shadow-md transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showPayForm ? 'close' : 'payments'}
                        </span>
                        {showPayForm ? 'Cancel' : 'Record Payment'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline pay form */}
                {showPayForm && !isPaid && (
                  <form
                    onSubmit={handlePay}
                    className="bg-surface-container-low/50 rounded-xl p-4 space-y-3 border border-primary/20 mt-3"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      New Payment
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Amount */}
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          max={payData.summary.remainingBalance}
                          value={payForm.amount}
                          onChange={(e) =>
                            setPayForm((p) => ({ ...p, amount: e.target.value }))
                          }
                          placeholder={`Max ₹${fmt(payData.summary.remainingBalance)}`}
                          required
                          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPayForm((p) => ({
                              ...p,
                              amount: String(payData.summary.remainingBalance),
                            }))
                          }
                          className="mt-1 text-[11px] text-primary font-semibold hover:underline"
                        >
                          Pay full (₹{fmt(payData.summary.remainingBalance)})
                        </button>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                          Date *
                        </label>
                        <input
                          type="datetime-local"
                          value={payForm.paymentDate}
                          onChange={(e) =>
                            setPayForm((p) => ({ ...p, paymentDate: e.target.value }))
                          }
                          required
                          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
                        />
                      </div>

                      {/* Mode */}
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                          Mode
                        </label>
                        <select
                          value={payForm.paymentMode}
                          onChange={(e) =>
                            setPayForm((p) => ({ ...p, paymentMode: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
                        >
                          {PAYMENT_MODES.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {/* Notes */}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={payForm.notes}
                          onChange={(e) =>
                            setPayForm((p) => ({ ...p, notes: e.target.value }))
                          }
                          placeholder="Optional remarks"
                          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-gradient-to-br from-secondary to-primary text-white rounded-xl font-semibold text-sm shadow hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                    >
                      {submitting && (
                        <span className="material-symbols-outlined animate-spin text-sm">
                          progress_activity
                        </span>
                      )}
                      Confirm Payment
                    </button>
                  </form>
                )}

                {/* Payment history list */}
                {payData.payments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                      Payment History ({payData.payments.length})
                    </p>
                    <div className="space-y-2">
                      {payData.payments.map((pay, idx) => (
                        <div
                          key={pay._id}
                          className="flex items-center justify-between bg-surface-container-low/50 rounded-xl px-4 py-2.5 gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                idx === 0
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-surface-container text-on-surface-variant'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-on-surface">
                                {fmtDate(pay.paymentDate)}
                              </p>
                              <p className="text-xs text-on-surface-variant">
                                {pay.paymentMode}
                                {pay.notes && ` · ${pay.notes}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="font-bold text-primary text-sm">₹{fmt(pay.amount)}</p>
                            <button
                              onClick={() => {
                                setDeletePayId(pay._id);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1 rounded-lg text-error hover:bg-error/10 transition-colors"
                              title="Delete payment"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete payment confirmation */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletePayId(null);
        }}
      />
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function MerchantProfileDrawer({ merchantName, onClose, onDataChange }) {
  const [transactions, setTransactions] = useState([]);
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [totalStandaloneAdv, setTotalStandaloneAdv] = useState(0);
  const [totalMasterPayments, setTotalMasterPayments] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let profile = null;
      try {
        const { data: mRes } = await merchantMasterAPI.search(merchantName);
        if (mRes.data && mRes.data.length > 0) {
          profile = mRes.data.find(m => m.name.toLowerCase() === merchantName.toLowerCase()) || mRes.data[0];
        }
      } catch (err) {
        console.error('Failed to load merchant profile', err);
      }

      // Fetch all transactions for this merchant
      const { data: res } = await merchantTxnAPI.getAll({
        merchantName,
        sort: '-transactionDate',
        limit: 500,
      });
      setTransactions(res.data);

      if (profile) {
        setMerchantProfile(profile);
      } else if (res.data && res.data.length > 0 && res.data[0].merchant) {
        setMerchantProfile({ _id: res.data[0].merchant, name: merchantName });
      } else {
        setMerchantProfile(null);
      }
    } catch {
      toast.error('Failed to load merchant history');
    }
    setLoading(false);
  }, [merchantName]);

  useEffect(() => {
    load();
  }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Aggregate stats across all transactions
  const summary = transactions.reduce(
    (acc, t) => ({
      totalNetQty:     acc.totalNetQty     + (t.netQty        || 0),
      totalGrossAmt:   acc.totalGrossAmt   + (t.grossAmount   || 0),
      totalAdvance:    acc.totalAdvance    + (t.advancePayment || 0),
      totalFinalPay:   acc.totalFinalPay   + (t.finalPayable  || 0),
      totalBalance:    acc.totalBalance    + (t.balance        || 0),
    }),
    { totalNetQty: 0, totalGrossAmt: 0, totalAdvance: 0, totalFinalPay: 0, totalBalance: 0 }
  );

  // Parent page refresh (table + stats) — keep stable
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  const handleDataChange = useCallback(() => {
    load();                       // refresh drawer txn balances
    onDataChangeRef.current?.();  // refresh parent table/stats
  }, [load]);

  // Stable callbacks — prevents Advance/Payment sections from re-fetching
  const handleAdvancesLoaded = useCallback((total) => setTotalStandaloneAdv(total), []);
  const handlePaymentsLoaded = useCallback((total) => setTotalMasterPayments(total), []);

  // Net payable = outstanding balance across txns minus standalone advances minus general payments
  const netPayableAfterAdv = summary.totalBalance - totalStandaloneAdv - totalMasterPayments;

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
              <span className="material-symbols-outlined text-primary text-xl">person</span>
              <h2 className="font-headline text-xl font-bold text-primary">
                {merchantName}
              </h2>
            </div>
            {merchantProfile && (
              <div className="flex flex-wrap gap-4 mt-2 mb-1 text-sm text-on-surface">
                {merchantProfile.phone && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">phone</span>
                    {merchantProfile.phone}
                  </span>
                )}
                {merchantProfile.address && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                    {merchantProfile.address}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-on-surface-variant mt-0.5">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · All time history
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* ── Summary bar ── */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-b border-outline-variant/20 shrink-0">
            {[
              { label: 'Total Net Qty', value: `${summary.totalNetQty.toFixed(2)} kg`, icon: 'grass' },
              { label: 'Gross Amount', value: `₹${fmt(summary.totalGrossAmt)}`, icon: 'payments' },
              { label: 'Advances Given', value: `₹${fmt(totalStandaloneAdv)}`, icon: 'currency_rupee', highlight: totalStandaloneAdv > 0 },
              { label: 'Final Payable', value: `₹${fmt(summary.totalFinalPay)}`, icon: 'receipt_long' },
              {
                label: 'Net Payable',
                value: `₹${fmt(netPayableAfterAdv)}`,
                icon: 'account_balance_wallet',
                highlight: netPayableAfterAdv > 0,
                isNegative: netPayableAfterAdv < 0,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col px-4 py-3 border-r border-outline-variant/10 last:border-r-0"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-sm text-primary/60">{s.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {s.label}
                  </span>
                </div>
                <span
                  className={`font-headline font-bold text-base ${
                    s.isNegative ? 'text-red-600' : (s.highlight ? 'text-orange-600' : 'text-on-surface')
                  }`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Advance Payments Section ── */}
        {!loading && (
          <AdvanceSection
            merchantProfile={merchantProfile}
            merchantName={merchantName}
            onDataChange={handleDataChange}
            onAdvancesLoaded={handleAdvancesLoaded}
          />
        )}

        {/* ── Payment to Merchant Section ── */}
        {!loading && (
          <PaymentSection
            merchantProfile={merchantProfile}
            merchantName={merchantName}
            onDataChange={handleDataChange}
            onPaymentsLoaded={handlePaymentsLoaded}
          />
        )}

        {/* ── Invoice Download Section ── */}
        {!loading && <InvoiceSection merchantName={merchantName} />}

        {/* ── Transaction list ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">
                progress_activity
              </span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl text-outline mb-3">receipt_long</span>
              <p className="text-sm">No transactions found for this merchant.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant px-1">
                Tap a transaction to see details &amp; manage payments
              </p>
              {transactions.map((txn, index) => (
                <TransactionCard
                  key={txn._id}
                  txn={txn}
                  index={index}
                  onDataChange={handleDataChange}
                />
              ))}
            </>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-4 shrink-0" />
      </div>
    </div>,
    document.body
  );
}
