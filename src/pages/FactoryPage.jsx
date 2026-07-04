import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { factoryAPI } from '../api/factoryApi';
import { buyerAPI } from '../api/buyerApi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import CustomDateRangeModal from '../components/merchant/CustomDateRangeModal';
import BuyerHistoryDrawer from '../components/factory/BuyerHistoryDrawer';

const PAYMENT_MODES = ['Cash', 'Online', 'Cheque'];

const getEmptyForm = () => ({
  date:           new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  buyerName:      '',
  buyerId:        '',
  buyerObj:       null,
  totalQuantity:  '',
  lessPercentage: '',
  fineLeaf:       '',
  rate:           '',
  advance:        '',
  dueDate:        '',
  remarks:        '',
});

const getEmptyPayment = () => ({
  date:   new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  amount: '',
  mode:   'Online',
});

// ── helpers ────────────────────────────────────────────────
const fmt  = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtN = (n) => parseFloat(n || 0).toFixed(2);

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
  return { lessQuantity: lq, netQuantity: nq, totalAmount: ta, totalPaid: paid, due };
}

// ── Payment Modal ───────────────────────────────────────────
function PaymentModal({ sale, onClose, onSaved }) {
  const [payments, setPayments] = useState(sale.payments || []);
  const [form, setForm] = useState(getEmptyPayment());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const virtuals = calcVirtuals(sale.totalQuantity, sale.lessPercentage, sale.rate, sale.advance, payments);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const { data } = await factoryAPI.addPayment(sale._id, form);
      setPayments(data.data.payments);
      setForm(getEmptyPayment());
      toast.success('Payment recorded!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to save payment');
    }
    setSaving(false);
  };

  const handleRemove = async (paymentId) => {
    try {
      const { data } = await factoryAPI.removePayment(sale._id, paymentId);
      setPayments(data.data.payments);
      toast.success('Payment removed');
      onSaved();
    } catch { toast.error('Failed to remove payment'); }
    setDeleteId(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{sale.buyerName}</h3>
              <p className="text-white/80 text-sm mt-0.5">{new Date(sale.date).toLocaleDateString('en-IN')}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total Amount', value: `₹${fmt(virtuals.totalAmount)}` },
              { label: 'Advance',      value: `₹${fmt(sale.advance)}` },
              { label: 'Due',          value: `₹${fmt(virtuals.due)}`, highlight: virtuals.due > 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 ${s.highlight ? 'bg-red-500/80' : 'bg-white/15'}`}>
                <p className="text-white/70 text-xs">{s.label}</p>
                <p className="text-white font-bold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="flex-1 overflow-y-auto p-5">
          <h4 className="font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-3">Payment History</h4>
          {payments.length === 0 ? (
            <p className="text-center py-6 text-on-surface-variant text-sm">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {payments.map((p) => (
                <div key={p._id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${p.mode === 'Cash' ? 'bg-green-500' : p.mode === 'Cheque' ? 'bg-yellow-500' : 'bg-primary'}`} />
                    <div>
                      <p className="font-semibold text-sm text-on-surface">₹{fmt(p.amount)}</p>
                      <p className="text-xs text-on-surface-variant">{new Date(p.date).toLocaleDateString('en-IN')} · {p.mode}</p>
                    </div>
                  </div>
                  {deleteId === p._id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleRemove(p._id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg">Yes</button>
                      <button onClick={() => setDeleteId(null)} className="px-2 py-1 text-xs bg-surface-container text-on-surface rounded-lg">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(p._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-error transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Payment Form */}
          <h4 className="font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-3">Add Payment</h4>
          <form onSubmit={handleAdd} className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Date</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Amount (₹)</label>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" required
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Mode</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-sm text-on-surface focus:outline-none focus:border-primary transition-all">
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-gradient-to-r from-secondary to-primary text-white rounded-xl font-semibold text-sm shadow hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60">
                {saving ? 'Saving...' : '+ Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── CSV helpers ────────────────────────────────────────────
const CSV_HEADERS = ['date','buyerName','totalQuantity','lessPercentage','rate','advance','dueDate','remarks'];
const CSV_TEMPLATE = CSV_HEADERS.join(',') + '\n' +
  '2026-06-01,Buyer Name,663,2,24,2400,2026-07-01,Fertilizer';

// Convert DD.MM.YYYY or DD/MM/YYYY → YYYY-MM-DD (ISO)
function toISODate(raw) {
  if (!raw || raw === '—' || raw === '-') return '';
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // DD.MM.YYYY or DD/MM/YYYY
  const m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return raw;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Normalize headers: lowercase, remove ALL non-alpha chars (spaces, dots, brackets, etc.)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));

  // Flexible column name aliases — covers "TOTAL QNTY.", "QNTY", "NET QNTY.", etc.
  const colMap = {
    date:           ['date','saledate','dt'],
    buyerName:      ['buyername','name','buyer','clientname','client'],
    totalQuantity:  ['totalquantity','totalqty','totalqnty','qty','qnty','quantity','grossqty','grossqnty','totqty','totqnty'],
    lessPercentage: ['lesspercentage','lesspercent','less','lesspct','losspercent','losspercentage','lesspercen'],
    rate:           ['rate','price','pricepkg','ratepkg','priceperkg','rateperkg'],
    advance:        ['advance','adv','advancepaid'],
    dueDate:        ['duedate','dueon','duedt','dueby'],  // NO 'due' — that's the amount column in Excel
    remarks:        ['remarks','remark','note','notes','comment','comments'],
  };

  // Skip columns that are pre-calculated in Excel (we recompute them)
  const skipCols = new Set(['lessqty','lessqnty','netqty','netqnty','nqty','totalamount','totalamt','amount']);

  const idx = {};
  for (const [field, aliases] of Object.entries(colMap)) {
    // find first header that matches an alias AND is not a skip column
    const found = headers.findIndex(h => aliases.includes(h) && !skipCols.has(h));
    idx[field] = found; // -1 means not found
  }

  // ── helper: strip Excel formatting from numbers (%,  spaces, commas, ₹, $)
  const cleanNum = (raw) => raw.replace(/[^0-9.-]/g, '');
  // ── helper: confirm a string is a plausible date (not a bare number like '38')
  const isValidDate = (raw) => raw && !/^\d{1,5}$/.test(raw.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const get  = (field) => (idx[field] !== undefined && idx[field] !== -1) ? (cols[idx[field]] || '') : '';

    const rawBuyer = get('buyerName');
    // Skip summary/total rows (no buyer name or numeric-only buyer cell)
    if (!rawBuyer || /^total/i.test(rawBuyer) || /^\d+(\.\d+)?$/.test(rawBuyer)) continue;

    const rawTotalQty  = cleanNum(get('totalQuantity'));
    const rawRate      = cleanNum(get('rate'));
    const rawLessPct   = cleanNum(get('lessPercentage')) || '2';  // strip trailing '%'
    const rawAdvance   = cleanNum(get('advance')) || '0';
    const rawDateStr   = get('date');
    const rawDueDateStr = get('dueDate');

    // Only convert to ISO if value looks like a date (not a bare number)
    const rawDate    = toISODate(rawDateStr);
    const rawDueDate = isValidDate(rawDueDateStr) ? toISODate(rawDueDateStr) : '';

    const row = {
      date:           rawDate,
      buyerName:      rawBuyer,
      totalQuantity:  rawTotalQty,
      lessPercentage: rawLessPct,
      rate:           rawRate,
      advance:        rawAdvance,
      dueDate:        rawDueDate,
      remarks:        get('remarks') || '',
    };

    const errs = [];
    if (!row.buyerName)                                              errs.push('Buyer Name missing');
    if (!row.totalQuantity || isNaN(+row.totalQuantity) || +row.totalQuantity <= 0) errs.push('Invalid Total Qty (must be > 0)');
    if (!row.rate          || isNaN(+row.rate)          || +row.rate <= 0)          errs.push('Invalid Rate (must be > 0)');
    if (isNaN(+row.lessPercentage) || +row.lessPercentage < 0 || +row.lessPercentage > 100) errs.push('Invalid Less % (0-100)');
    rows.push({ ...row, _row: i, _errors: errs });
  }
  return rows;
}

// ── CSV Import Modal ─────────────────────────────────────────
function CsvImportModal({ onClose, onImported }) {
  const fileRef = useRef(null);
  const [rows,       setRows]       = useState([]);
  const [parsed,     setParsed]     = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [failedRows, setFailedRows] = useState({}); // { rowIndex: errorMessage }

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setRows(parsed);
        setParsed(true);
        if (parsed.length === 0) toast.error('No valid rows found in CSV');
        else toast.success(`Found ${parsed.length} row(s). Review before importing.`);
      } catch (err) { toast.error(err.message); }
    };
    reader.readAsText(file);
  };

  const removeRow = (idx) => setRows(r => r.filter((_, i) => i !== idx));

  const handleImport = async () => {
    const valid = rows.filter(r => r._errors.length === 0);
    if (valid.length === 0) { toast.error('No valid rows to import'); return; }
    setImporting(true);
    setProgress(0);
    setFailedRows({});
    let ok = 0;
    const newFailed = {};

    for (let i = 0; i < valid.length; i++) {
      const { _row, _errors, ...payload } = valid[i];
      // Log what we're sending so we can debug easily
      console.log(`[CSV Import] Row ${_row} payload:`, payload);
      try {
        await factoryAPI.create(payload);
        ok++;
      } catch (err) {
        // Capture the exact backend error message
        const backendErrors = err.response?.data?.errors;
        const backendMsg    = err.response?.data?.message;
        const errMsg = backendErrors
          ? backendErrors.map(e => `${e.path}: ${e.msg} (got "${e.value}")`).join(' | ')
          : (backendMsg || err.message || 'Unknown error');
        console.error(`[CSV Import] Row ${_row} FAILED:`, errMsg, '\nPayload was:', payload);
        newFailed[i] = errMsg;
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    setFailedRows(newFailed);
    setImporting(false);
    const failCount = Object.keys(newFailed).length;
    if (ok)        toast.success(`✅ Imported ${ok} record${ok > 1 ? 's' : ''} successfully!`);
    if (failCount) toast.error(`❌ ${failCount} row(s) failed — see errors highlighted below.`);
    onImported();
    if (!failCount) onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'factory_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount   = rows.filter(r => r._errors.length === 0).length;
  const invalidCount = rows.filter(r => r._errors.length >  0).length;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">upload_file</span>
            <div>
              <h3 className="text-lg font-bold">Import Factory from CSV</h3>
              <p className="text-white/75 text-sm">Upload a CSV file to bulk-add sale records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1 — Pick file */}
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow hover:bg-primary/90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-base">folder_open</span>
              {parsed ? 'Change File' : 'Choose CSV File'}
            </button>
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:bg-surface-container transition-all">
              <span className="material-symbols-outlined text-base">download</span>
              Download Template
            </button>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            {parsed && (
              <div className="flex gap-3 ml-auto">
                {validCount   > 0 && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{validCount} valid</span>}
                {invalidCount > 0 && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{invalidCount} invalid</span>}
              </div>
            )}
          </div>

          {/* CSV Format hint */}
          {!parsed && (
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4">
              <p className="text-sm font-semibold text-on-surface mb-2">Expected CSV columns:</p>
              <div className="flex flex-wrap gap-2">
                {CSV_HEADERS.map(h => (
                  <span key={h} className="px-2.5 py-1 bg-surface-container rounded-lg text-xs font-mono text-on-surface-variant">{h}</span>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-3">💡 Download the template above and fill it with your data. Column names are flexible (e.g. "Buyer Name", "buyerName", "name" all work).</p>
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/30">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">#</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Date</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Buyer</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Total Qty</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Less %</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Net Qty</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Rate</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Total Amt</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Advance</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Remarks</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {rows.map((row, i) => {
                    const v = calcVirtuals(row.totalQuantity, row.lessPercentage, row.rate, row.advance, []);
                    const hasErr      = row._errors.length > 0;
                    const backendErr  = failedRows[i];  // set after import attempt
                    const rowClass    = hasErr ? 'bg-red-50' : backendErr ? 'bg-orange-50' : 'hover:bg-surface-container-lowest/40';
                    return (
                      <tr key={i} className={`transition-colors ${rowClass}`}>
                        <td className="px-3 py-3 text-on-surface-variant">{row._row}</td>
                        <td className="px-3 py-3 font-medium">{row.date || '—'}</td>
                        <td className="px-3 py-3 font-semibold text-on-surface">{row.buyerName || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-3 py-3 text-right">{fmtN(row.totalQuantity)}</td>
                        <td className="px-3 py-3 text-right">{fmtN(row.lessPercentage)}%</td>
                        <td className="px-3 py-3 text-right font-semibold text-primary">{fmtN(v.netQuantity)}</td>
                        <td className="px-3 py-3 text-right">{fmt(row.rate)}</td>
                        <td className="px-3 py-3 text-right font-bold text-primary">₹{fmt(v.totalAmount)}</td>
                        <td className="px-3 py-3 text-right">₹{fmt(row.advance)}</td>
                        <td className="px-3 py-3">{row.remarks || '—'}</td>
                        <td className="px-3 py-3 min-w-[120px]">
                          {hasErr
                            ? <span title={row._errors.join(', ')} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full cursor-help text-xs">⚠ {row._errors[0]}</span>
                            : backendErr
                              ? <span title={backendErr} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full cursor-help text-xs">⚠ Backend: {backendErr.slice(0,40)}</span>
                              : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✓ OK</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => removeRow(i)} className="p-1 rounded-lg hover:bg-red-100 text-error transition-colors" title="Remove this row">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant">
            {rows.length > 0 ? `${validCount} of ${rows.length} rows will be imported` : 'No file selected'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 border border-outline-variant rounded-full text-sm font-medium hover:bg-surface-container transition-all">Cancel</button>
            <button onClick={handleImport} disabled={importing || validCount === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-secondary to-primary text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              {importing ? `Importing ${progress}%...` : `Import ${validCount} Record${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ── Main FactoryPage ──────────────────────────────────────────
export default function FactoryPage() {
  const [items,       setItems]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [form,        setForm]        = useState(getEmptyForm());
  const [editing,     setEditing]     = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [deleteId,    setDeleteId]    = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);   // for payment modal
  const [showCsvImport, setShowCsvImport] = useState(false); // for CSV import modal
  const [buyerHistory, setBuyerHistory]   = useState(null);  // buyer name string for history drawer

  // ── Date Filter state ──
  const [datePreset, setDatePreset] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [tempDates, setTempDates] = useState({ start: '', end: '' });

  // live preview virtuals while filling form
  const preview = calcVirtuals(form.totalQuantity, form.lessPercentage, form.rate, form.advance, []);

  // ── fetch ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const { data } = await factoryAPI.getAll(params);
      setItems(data.data);
    } catch { toast.error('Failed to load factory data'); }
    setLoading(false);
  }, [search, startDate, endDate]);

  const fetchStats = async () => {
    try { const { data } = await factoryAPI.getStats(); setStats(data.data); } catch {}
  };

  useEffect(() => { fetchItems(); fetchStats(); }, [fetchItems]);

  // ── CRUD ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await factoryAPI.update(editing, form); toast.success('Sale record updated!'); }
      else          { await factoryAPI.create(form);          toast.success('Sale record created!'); }
      setForm(getEmptyForm()); setEditing(null); setShowForm(false);
      fetchItems(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Save failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      date:           item.date?.slice(0, 16) || '',
      buyerName:      item.buyerName,
      buyerId:        item.buyer || '',
      buyerObj:       item.buyer ? { _id: item.buyer, name: item.buyerName, phone: '' } : null,
      totalQuantity:  item.totalQuantity,
      lessPercentage: item.lessPercentage,
      fineLeaf:       item.fineLeaf || '',
      rate:           item.rate,
      advance:        item.advance || 0,
      dueDate:        item.dueDate?.slice(0, 16) || '',
      remarks:        item.remarks || '',
    });
    setEditing(item._id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    try { await factoryAPI.remove(deleteId); toast.success('Deleted'); fetchItems(); fetchStats(); }
    catch { toast.error('Delete failed'); }
    setDeleteId(null);
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="relative">
      {/* Date Modal */}
      <CustomDateRangeModal
        isOpen={showCustomDateModal}
        onClose={() => setShowCustomDateModal(false)}
        tempDates={tempDates}
        setTempDates={setTempDates}
        onApply={() => {
          setStartDate(tempDates.start);
          setEndDate(tempDates.end);
          setDatePreset('Custom');
          setShowCustomDateModal(false);
        }}
        onClear={() => {
          setStartDate('');
          setEndDate('');
          setDatePreset('');
          setShowCustomDateModal(false);
        }}
      />
      {/* Buyer History Drawer */}
      {buyerHistory && (
        <BuyerHistoryDrawer
          buyerName={buyerHistory}
          onClose={() => setBuyerHistory(null)}
          onPaymentClick={(item) => setPaymentSale(item)}
          onDataChange={() => { fetchItems(); fetchStats(); }}
        />
      )}
      {/* CSV Import Modal */}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onImported={() => { fetchItems(); fetchStats(); }}
        />
      )}

      {/* Payment Modal */}
      {paymentSale && (
        <PaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onSaved={() => { fetchItems(); fetchStats(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <ConfirmationModal
          title="Delete Sale Record"
          message="This will permanently remove this sale entry and all its payment history."
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div>
        {/* ── Page Header ── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-headline text-3xl font-semibold text-primary">Factory Ledger</h1>
            <p className="text-on-surface-variant mt-1">Track tea factory, quantities, rates & payments.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCsvImport(true)}
              className="px-5 py-3 border border-outline-variant bg-surface-container text-on-surface rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-surface-container-high transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              Import CSV
            </button>
            <button
              onClick={() => { setShowForm(!showForm); if (!showForm && !editing) setForm(getEmptyForm()); if (showForm) setEditing(null); }}
              className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cancel' : 'New Entry'}
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Factory',    value: `₹${fmt(stats.totalFactoryAmount)}`, icon: 'shopping_bag',  color: 'text-primary' },
              { label: 'Total Advance',  value: `₹${fmt(stats.totalAdvance)}`,     icon: 'price_check',   color: 'text-secondary' },
              { label: 'Total Received', value: `₹${fmt(stats.totalPaid)}`,        icon: 'payments',      color: 'text-green-600' },
              { label: 'Total Due',      value: `₹${fmt(stats.totalDue)}`,         icon: 'account_balance_wallet', color: stats.totalDue > 0 ? 'text-red-500' : 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">{s.label}</p>
                  <span className={`material-symbols-outlined text-xl ${s.color} opacity-60`}>{s.icon}</span>
                </div>
                <span className={`font-headline text-xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Entry Form ── */}
        {showForm && (
          <div className="glass-card rounded-2xl p-6 mb-8 shadow-lg">
            <h2 className="font-headline text-xl font-semibold text-primary mb-4">
              {editing ? 'Edit Sale Entry' : 'New Sale Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Date *</label>
                  <input name="date" type="datetime-local" value={form.date} onChange={handleChange} required
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Buyer Name (SearchableSelect) */}
                <div className="lg:col-span-2">
                  <SearchableSelect
                    api={buyerAPI}
                    value={form.buyerObj || null}
                    onChange={(b) => setForm(f => ({ ...f, buyerObj: b, buyerId: b?._id || '', buyerName: b?.name || '' }))}
                    label="Buyer Name"
                    entityLabel="Buyer"
                    placeholder="Search buyer by name or phone..."
                    required
                  />
                </div>
              </div>


              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total Qty */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Total Qty (kg) *</label>
                  <input name="totalQuantity" type="number" min="0" step="0.01" value={form.totalQuantity} onChange={handleChange} required placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Less % */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Less % *</label>
                  <input name="lessPercentage" type="number" min="0" max="100" step="0.01" value={form.lessPercentage} onChange={handleChange} required placeholder="2.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Fine Leaf % */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Fine Leaf %</label>
                  <input name="fineLeaf" type="number" min="0" max="100" step="0.01" value={form.fineLeaf} onChange={handleChange} placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Less Qty — computed preview */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Less Qty (kg)</label>
                  <div className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/50 text-sm text-on-surface-variant font-medium">
                    {fmtN(preview.lessQuantity)}
                  </div>
                </div>
                {/* Net Qty — computed preview */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Net Qty (kg)</label>
                  <div className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/50 text-sm text-primary font-bold">
                    {fmtN(preview.netQuantity)}
                  </div>
                </div>
                {/* Rate */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Rate (₹/kg) *</label>
                  <input name="rate" type="number" min="0" step="0.01" value={form.rate} onChange={handleChange} required placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Total Amount — computed preview */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Total Amount (₹)</label>
                  <div className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-primary/5 text-sm text-primary font-bold">
                    ₹{fmt(preview.totalAmount)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Advance */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Advance (₹)</label>
                  <input name="advance" type="number" min="0" step="0.01" value={form.advance} onChange={handleChange} placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Due Date</label>
                  <input name="dueDate" type="datetime-local" value={form.dueDate} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
                </div>
                {/* Due Preview */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Estimated Due (₹)</label>
                  <div className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold ${preview.due > 0 ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                    ₹{fmt(preview.due)}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-8 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95">
                  {editing ? 'Update Entry' : 'Save Entry'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(getEmptyForm()); setEditing(null); }}
                  className="px-8 py-3 bg-surface-container text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container-high transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Factory Table ── */}
        <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
          {/* Table Header / Filters */}
          <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
            <h3 className="font-headline text-xl font-semibold text-primary flex-1">Factory Records</h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buyer..."
                  className="pl-9 pr-4 py-2 bg-surface-container rounded-full border-none text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              {/* Preset Date Filters */}
              <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/30 hidden sm:flex">
                {['Today', 'Last 7 Days', 'This Month'].map(preset => (
                  <button key={preset}
                    onClick={() => {
                      setDatePreset(preset);
                      const now = new Date();
                      if (preset === 'Today') {
                        const t = now.toISOString().slice(0, 10);
                        setStartDate(t); setEndDate(t);
                      } else if (preset === 'Last 7 Days') {
                        const past = new Date(now); past.setDate(past.getDate() - 7);
                        setStartDate(past.toISOString().slice(0, 10)); setEndDate(now.toISOString().slice(0, 10));
                      } else if (preset === 'This Month') {
                        const first = new Date(now.getFullYear(), now.getMonth(), 1);
                        setStartDate(first.toISOString().slice(0, 10)); setEndDate(now.toISOString().slice(0, 10));
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      datePreset === preset ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setTempDates({ start: startDate, end: endDate }); setShowCustomDateModal(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  datePreset === 'Custom' || (startDate && datePreset === '') ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                {startDate && endDate && datePreset !== 'Today' && datePreset !== 'Last 7 Days' && datePreset !== 'This Month'
                  ? `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                  : 'Date'}
              </button>

              {(search || startDate) && (
                <button
                  onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setDatePreset(''); }}
                  className="flex items-center gap-1 text-error hover:bg-error/10 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
              <tr className="bg-surface border-y border-outline-variant/20 shadow-sm">
                {['Sl. No.', 'Date', 'Buyer Name', 'Total Qty', 'Less %', 'Less Qty', 'Fine Leaf %', 'Net Qty', 'Rate (₹)', 'Total Amt (₹)', 'Advance (₹)', 'Paid (₹)', 'Due (₹)', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-on-surface-variant font-bold text-sm whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl text-outline mb-2 block">inventory_2</span>
                    No factory entries yet. Click &quot;New Entry&quot; to create one.
                  </td></tr>
                ) : items.map((item, index) => {
                  const v = calcVirtuals(item.totalQuantity, item.lessPercentage, item.rate, item.advance, item.payments);
                  const isDue = v.due > 0;
                  return (
                    <tr key={item._id} className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface">
                      <td className="px-4 py-4 text-on-surface-variant font-medium">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-on-surface-variant">
                        <span className="block">{new Date(item.date).toLocaleDateString('en-CA')}</span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-on-surface whitespace-nowrap">
                        <button
                          onClick={() => setBuyerHistory(item.buyerName)}
                          className="text-left hover:text-primary hover:underline transition-colors"
                          title="View buyer history"
                        >
                          {item.buyerName}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right font-medium">{fmtN(item.totalQuantity)}</td>
                      <td className="px-4 py-4 text-right text-on-surface-variant">{fmtN(item.lessPercentage)}%</td>
                      <td className="px-4 py-4 text-right text-on-surface-variant">{fmtN(v.lessQuantity)}</td>
                      <td className="px-4 py-4 text-right text-on-surface-variant">
                        {item.fineLeaf > 0 ? `${fmtN(item.fineLeaf)}%` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-primary">{fmtN(v.netQuantity)}</td>
                      <td className="px-4 py-4 text-right">{fmt(item.rate)}</td>
                      <td className="px-4 py-4 text-right font-bold text-primary">₹{fmt(v.totalAmount)}</td>
                      <td className="px-4 py-4 text-right text-secondary">₹{fmt(item.advance)}</td>
                      <td className="px-4 py-4 text-right text-green-600">₹{fmt(v.totalPaid)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-bold ${isDue ? 'text-red-500' : 'text-green-600'}`}>
                          {isDue ? `₹${fmt(v.due)}` : '✓ Clear'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {isDue ? (
                            <button onClick={() => setPaymentSale(item)} title="Add Payment"
                              className="px-3 py-1.5 border border-[#3b4b59] text-[#3b4b59] rounded-lg text-xs font-semibold hover:bg-[#3b4b59]/5 transition-colors whitespace-nowrap flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">payments</span>
                              Payments
                            </button>
                          ) : (
                            <button onClick={() => setBuyerHistory(item.buyerName)} title="View Details"
                              className="px-3 py-1.5 border border-green-600 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors whitespace-nowrap flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Details
                            </button>
                          )}
                          <button onClick={() => handleEdit(item)} title="Edit"
                            className="px-3 py-1.5 border border-secondary text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/5 transition-colors whitespace-nowrap">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(item._id)} title="Delete"
                            className="px-3 py-1.5 border border-error text-error rounded-lg text-xs font-semibold hover:bg-error/5 transition-colors whitespace-nowrap">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Showing {items.length} record{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Sale Record"
        message="Are you sure you want to delete this sale? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
