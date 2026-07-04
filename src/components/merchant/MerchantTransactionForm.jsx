/**
 * MerchantTransactionForm — handles both "create" and "edit" modes.
 *
 * Props:
 *  form          – current form state object
 *  editing       – _id string if editing, null if creating
 *  calc          – live-calculated values (from merchantTxnAPI.compute)
 *  submitting    – boolean, disables submit button while request is in flight
 *  onFieldChange – (name, value) => void
 *  onSubmit      – (e) => void
 *  onCancel      – () => void
 */

import SearchableSelect from '../SearchableSelect';
import { merchantMasterAPI } from '../../api/merchantMasterApi';

const TEA_TYPES = ['Green Tea', 'CTC', 'Other'];


// ── Shared primitive components ────────────────────────────────────────────────
function InputField({ label, name, type = 'text', value, onChange, placeholder, required, readOnly, step, min }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
        {label}{required && ' *'}
      </label>
      <input
        id={`field-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        step={step}
        min={min}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-on-surface focus:outline-none transition-all
          ${readOnly
            ? 'bg-surface-container/30 border-outline-variant/30 text-on-surface-variant cursor-not-allowed'
            : 'border-outline-variant bg-surface-container-low/50 focus:border-primary'
          }`}
      />
    </div>
  );
}

function CalcRow({ label, value, bold, highlight, border }) {
  return (
    <div className={`flex justify-between items-center py-2 ${border ? 'border-t border-outline-variant/30 mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-primary text-base' : 'text-on-surface'}`}>
        ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// ── Main Form Component ────────────────────────────────────────────────────────
export default function MerchantTransactionForm({ form, editing, calc, submitting, onFieldChange, onSubmit, onCancel }) {
  // Wraps raw onChange events → calls onFieldChange(name, value)
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFieldChange(name, value);
  };

  return (
    <div className="glass-card rounded-2xl p-6 mb-8 shadow-xl shadow-primary/10">
      <h2 className="font-headline text-xl font-semibold text-primary mb-6">
        {editing ? 'Edit Transaction' : 'Record New Transaction'}
      </h2>

      <form id="merchant-transaction-form" onSubmit={onSubmit} noValidate>
        {/* ── Row 1: Merchant info ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Merchant selector */}
          <div className="lg:col-span-2">
            <SearchableSelect
              api={merchantMasterAPI}
              value={form.merchantObj || null}
              onChange={(m) => {
                onFieldChange('merchantObj', m);
                onFieldChange('merchantId', m?._id || '');
                onFieldChange('merchantName', m?.name || '');
                onFieldChange('merchantPhone', m?.phone || '');
              }}
              label="Merchant"
              entityLabel="Merchant"
              placeholder="Search by name or phone..."
              required
            />
          </div>

          {/* Phone — visible field, triggers findOrCreate lookup */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Phone Number
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[17px]">call</span>
              <input
                id="field-merchantPhone"
                name="merchantPhone"
                type="tel"
                value={form.merchantPhone || ''}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>
            {form.merchantPhone && !form.merchantId && (
              <p className="text-xs text-orange-500 mt-1">
                ⚠ Select merchant from dropdown to link
              </p>
            )}
            {form.merchantId && form.merchantPhone && (
              <p className="text-xs text-green-600 mt-1">✓ Linked to merchant record</p>
            )}
          </div>

          {/* Tea Type */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Tea Type *
            </label>
            <select
              id="field-teaType"
              name="teaType"
              value={form.teaType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
            >
              <option value="">Select type...</option>
              {TEA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Row 1b: Date ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <InputField
            label="Transaction Date & Time"
            name="transactionDate"
            type="datetime-local"
            value={form.transactionDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* ── Row 2: Quantity ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <InputField
            label="Gross Qty (kg)"
            name="grossQty"
            type="number"
            step="0.01"
            min="0"
            value={form.grossQty}
            onChange={handleChange}
            placeholder="0.00"
            required
          />
          <InputField
            label="Less %"
            name="lessPercent"
            type="number"
            step="0.01"
            min="0"
            value={form.lessPercent}
            onChange={handleChange}
            placeholder="0"
          />
          <InputField
            label="Fine Leaf %"
            name="fineLeaf"
            type="number"
            step="0.01"
            min="0"
            value={form.fineLeaf}
            onChange={handleChange}
            placeholder="0"
          />

          {/* Derived: Less Qty */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Less Qty (kg)
            </label>
            <div className="w-full px-4 py-2.5 rounded-xl bg-surface-container/30 border border-outline-variant/30 text-sm text-on-surface-variant font-semibold">
              {calc.lessQty.toFixed(2)}
            </div>
          </div>

          {/* Derived: Net Qty */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Net Qty (kg)
            </label>
            <div className="w-full px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary font-bold">
              {calc.netQty.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Row 3: Financial ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <InputField
            label="Rate per kg (₹)"
            name="ratePerKg"
            type="number"
            step="0.01"
            min="0"
            value={form.ratePerKg}
            onChange={handleChange}
            placeholder="0.00"
            required
          />
          <InputField
            label="Labor Count"
            name="laborCount"
            type="number"
            step="1"
            min="0"
            value={form.laborCount}
            onChange={handleChange}
            placeholder="0"
          />
          <InputField
            label="Charge / Worker (₹)"
            name="laborChargePerWorker"
            type="number"
            step="0.01"
            min="0"
            value={form.laborChargePerWorker}
            onChange={handleChange}
            placeholder="0.00"
          />

          {/* Derived: Total Labor */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Total Labor (₹)
            </label>
            <div className="w-full px-4 py-2.5 rounded-xl bg-surface-container/30 border border-outline-variant/30 text-sm text-on-surface-variant font-semibold">
              ₹{(calc.totalLaborCharges || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Advance Payment ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <InputField
            label="Advance Payment (₹)"
            name="advancePayment"
            type="number"
            step="0.01"
            min="0"
            value={form.advancePayment}
            onChange={handleChange}
            placeholder="0.00"
          />
        </div>

        {/* ── Live Calculation Summary ── */}
        <div className="bg-surface-container/40 border border-outline-variant/20 rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">calculate</span>
            Live Calculation Preview
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
            <div>
              <CalcRow label="Net Qty × Rate" value={calc.grossAmount} />
              <CalcRow label={`Labor (${form.laborCount || 0} workers × ₹${form.laborChargePerWorker || 0})`} value={calc.totalLaborCharges} />
              <CalcRow label="Net Payable" value={calc.netPayable} bold />
            </div>
            <div>
              <CalcRow label="Net Payable" value={calc.netPayable} />
              <CalcRow label="Less Advance Payment" value={form.advancePayment || 0} />
              <CalcRow label="Final Balance" value={calc.finalPayable} bold highlight border />
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Notes</label>
          <textarea
            id="field-notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Optional remarks..."
            className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all resize-none"
          />
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex gap-3">
          <button
            id="btn-submit-transaction"
            type="submit"
            disabled={submitting}
            className="px-7 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && (
              <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            )}
            {editing ? 'Update Transaction' : 'Save Transaction'}
          </button>
          <button
            id="btn-cancel-transaction"
            type="button"
            onClick={onCancel}
            className="px-7 py-3 bg-surface-container text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
