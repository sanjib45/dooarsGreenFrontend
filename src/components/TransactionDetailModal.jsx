import { useState, useEffect, useCallback } from 'react';
import { merchantTxnAPI } from '../api/merchantTransactionApi';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'];

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function InfoRow({ label, value, highlight, large }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-outline-variant/10 last:border-0">
      <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">{label}</span>
      <span className={`font-bold ${large ? 'text-base' : 'text-sm'} ${highlight ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </span>
    </div>
  );
}

export default function TransactionDetailModal({ txnId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Cash',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePayId, setDeletePayId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await merchantTxnAPI.getPayments(txnId);
      setData(res.data);
    } catch {
      toast.error('Failed to load transaction details');
    }
    setLoading(false);
  }, [txnId]);

  useEffect(() => { load(); }, [load]);

  const handlePay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await merchantTxnAPI.addPayment(txnId, payForm);
      toast.success('Payment recorded!');
      setPayForm({ amount: '', paymentDate: new Date().toISOString().slice(0, 10), paymentMode: 'Cash', notes: '' });
      setShowPayForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Payment failed');
    }
    setSubmitting(false);
  };

  const handleDeletePayment = (payId) => {
    setDeletePayId(payId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeletePayment = async () => {
    try {
      await merchantTxnAPI.deletePayment(txnId, deletePayId);
      toast.success('Payment deleted');
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setShowDeleteConfirm(false);
      setDeletePayId(null);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <span className="material-symbols-outlined animate-spin text-white text-4xl">progress_activity</span>
      </div>
    );
  }

  const { transaction: txn, payments, summary } = data || {};
  const isPaid = summary?.isPaidFull;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      {/* Side Drawer */}
      <div className="h-full w-full max-w-2xl bg-surface flex flex-col shadow-2xl overflow-hidden animate-slide-in-right">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 bg-surface-container-low/60 shrink-0">
          <div>
            <h2 className="font-headline text-xl font-bold text-primary">Transaction Details</h2>
            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">{txn?.transactionId}</p>
          </div>
          <div className="flex items-center gap-3">
            {isPaid ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span> Fully Paid
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">pending</span> Pending
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Merchant Info ── */}
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">person</span>
              Merchant Info
            </h3>
            <InfoRow label="Merchant Name" value={txn?.merchantName} />
            <InfoRow label="Tea Type" value={txn?.teaType} />
            <InfoRow label="Transaction Date" value={txn ? new Date(txn.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />
            <InfoRow label="Transaction ID" value={<span className="font-mono text-xs">{txn?.transactionId}</span>} />
          </section>

          {/* ── Quantity Breakdown ── */}
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">grass</span>
              Quantity Breakdown
            </h3>
            <InfoRow label="Gross Quantity" value={`${txn?.grossQty} kg`} />
            <InfoRow label={`Less (${txn?.lessPercent}%)`} value={`${txn?.lessQty} kg`} />
            <InfoRow label="Net Quantity" value={`${txn?.netQty} kg`} highlight />
            <InfoRow label="Rate per kg" value={`₹${txn?.ratePerKg}`} />
          </section>

          {/* ── Financial Breakdown ── */}
          <section className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">calculate</span>
              Financial Breakdown
            </h3>
            <InfoRow label="Gross Amount" value={`₹${fmt(txn?.grossAmount)}`} />
            <InfoRow label={`Labour (${txn?.labourHeadCount ?? txn?.laborCount ?? 0} × ₹${txn?.labourCharge ?? txn?.laborChargePerWorker ?? 0})`} value={`− ₹${fmt(txn?.labourAmount || txn?.totalLaborCharges || ((txn?.labourHeadCount || txn?.laborCount || 0) * (txn?.labourCharge || txn?.laborChargePerWorker || 0)))}`} />
            <InfoRow label="Net Payable" value={`₹${fmt(txn?.netPayable)}`} highlight />
            <InfoRow label="Advance Payment" value={`− ₹${fmt(txn?.advancePayment)}`} />
            <div className="mt-2 pt-3 border-t-2 border-primary/20">
              <InfoRow label="Final Payable Amount" value={`₹${fmt(txn?.finalPayable)}`} highlight large />
            </div>
          </section>

          {/* ── Payment Summary ── */}
          <section className={`rounded-2xl p-5 border-2 ${isPaid ? 'border-green-300 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">account_balance_wallet</span>
              Payment Summary
            </h3>
            <InfoRow label="Final Payable" value={`₹${fmt(summary?.finalPayable)}`} />
            <InfoRow label="Total Paid So Far" value={`₹${fmt(summary?.totalPaid)}`} />
            <div className="mt-2 pt-3 border-t-2 border-outline-variant/30">
              <InfoRow
                label="Remaining Balance"
                value={`₹${fmt(summary?.remainingBalance)}`}
                highlight={!isPaid}
                large
              />
            </div>
          </section>

          {/* ── Record Payment Button ── */}
          {!isPaid && (
            <button
              id="btn-record-payment"
              onClick={() => {
                if (!showPayForm) {
                  setPayForm(p => ({ ...p, amount: summary?.remainingBalance ? String(summary.remainingBalance) : '' }));
                }
                setShowPayForm((v) => !v);
              }}
              className="w-full py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">{showPayForm ? 'close' : 'payments'}</span>
              {showPayForm ? 'Cancel Payment' : `Record Payment (₹${fmt(summary?.remainingBalance)} due)`}
            </button>
          )}

          {/* ── Pay Form ── */}
          {showPayForm && !isPaid && (
            <form id="payment-form" onSubmit={handlePay} className="glass-card rounded-2xl p-5 space-y-4">
              <h4 className="font-headline text-base font-semibold text-primary">New Payment</h4>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Amount (₹) *
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  max={summary?.remainingBalance}
                  value={payForm.amount}
                  onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder={`Max ₹${fmt(summary?.remainingBalance)}`}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm focus:outline-none focus:border-primary transition-all"
                />
                {/* Quick-fill full amount */}
                <button
                  type="button"
                  onClick={() => setPayForm((p) => ({ ...p, amount: String(summary?.remainingBalance) }))}
                  className="mt-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  Pay full balance (₹{fmt(summary?.remainingBalance)})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Date *</label>
                  <input
                    id="pay-date"
                    type="date"
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm((p) => ({ ...p, paymentDate: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Mode</label>
                  <select
                    id="pay-mode"
                    value={payForm.paymentMode}
                    onChange={(e) => setPayForm((p) => ({ ...p, paymentMode: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm focus:outline-none focus:border-primary transition-all"
                  >
                    {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Notes</label>
                <textarea
                  id="pay-notes"
                  value={payForm.notes}
                  onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional remarks..."
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm focus:outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <button
                id="btn-submit-payment"
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
                Confirm Payment
              </button>
            </form>
          )}

          {/* ── Payments History ── */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">receipt_long</span>
              Payment History ({payments?.length || 0})
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
              </div>
            ) : !payments?.length ? (
              <div className="text-center py-8 text-on-surface-variant glass-card rounded-2xl">
                <span className="material-symbols-outlined text-4xl text-outline block mb-2">payments</span>
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((pay, idx) => (
                  <div key={pay._id} className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                        ${idx === 0 ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-on-surface text-sm">
                          {new Date(pay.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                          {pay.paymentMode}
                        </p>
                        {pay.notes && <p className="text-xs text-on-surface-variant mt-1 truncate">{pay.notes}</p>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary text-base">₹{fmt(pay.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bottom padding */}
          <div className="h-6" />
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmDeletePayment}
        onCancel={() => { setShowDeleteConfirm(false); setDeletePayId(null); }}
      />
    </div>
  );
}
