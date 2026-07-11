import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

const CSV_HEADERS = [
  'date', 'merchantName', 'phone', 'teaType', 'grossQty', 'lessPercent', 
  'fineLeaf', 'rate', 'labourHeadCount', 'labourCharge', 'advancePayment', 'notes'
];
const CSV_TEMPLATE = CSV_HEADERS.join(',') + '\n' +
  '2026-06-01,Supplier Name,9876543210,Green Tea,663,2,0,24,0,0,2400,Fertilizer';

// Convert typical date strings to ISO YYYY-MM-DD
function toISODate(raw) {
  if (!raw || raw === '—' || raw === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return raw;
}

function parseMerchantCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Clean headers (remove non-alpha chars, to lowercase)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));

  const colMap = {
    transactionDate: ['date', 'txndate', 'transactiondate', 'dt', 'saledate'],
    merchantName:    ['merchant', 'merchantname', 'name', 'supplier', 'suppliername', 'buyer', 'buyername'],
    merchantPhone:   ['phone', 'phonenumber', 'contact', 'mobile'],
    teaType:         ['teatype', 'type', 'tea', 'leaf'],
    grossQty:        ['grossqty', 'grossquantity', 'qty', 'quantity', 'totalqty', 'totalquantity', 'totalqnty', 'grosswgt', 'weight', 'grossweight', 'totqty'],
    lessPercent:     ['lesspercent', 'lesspercentage', 'less', 'lesspct', 'losspercent'],
    fineLeaf:        ['fineleaf', 'fine', 'fineweight'],
    ratePerKg:       ['rate', 'rateperkg', 'price', 'priceperkg'],
    labourHeadCount: ['labourheadcount', 'labourcount', 'labours'],
    labourCharge:    ['labourcharge', 'labourrate'],
    advancePayment:  ['advancepayment', 'advance', 'adv', 'paid'],
    notes:           ['notes', 'note', 'remarks', 'remark', 'comments']
  };

  const idx = {};
  for (const [field, aliases] of Object.entries(colMap)) {
    const found = headers.findIndex(h => aliases.includes(h));
    idx[field] = found;
  }

  const cleanNum = (raw) => raw.replace(/[^0-9.-]/g, '');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const get  = (field) => (idx[field] !== undefined && idx[field] !== -1) ? (cols[idx[field]] || '') : '';

    const rawMerchant = get('merchantName');
    if (!rawMerchant || /^total/i.test(rawMerchant)) continue; // Skip summaries

    const rawDateStr = get('transactionDate');
    const rawGross = cleanNum(get('grossQty'));
    const rawRate  = cleanNum(get('ratePerKg'));

    const row = {
      transactionDate: toISODate(rawDateStr),
      merchantName:    rawMerchant,
      merchantPhone:   get('merchantPhone'),
      teaType:         get('teaType') || 'Green Tea',
      grossQty:        rawGross,
      lessPercent:     cleanNum(get('lessPercent')) || '0',
      fineLeaf:        cleanNum(get('fineLeaf')) || '0',
      ratePerKg:       rawRate,
      labourHeadCount: cleanNum(get('labourHeadCount')) || '0',
      labourCharge:    cleanNum(get('labourCharge')) || '0',
      advancePayment:  cleanNum(get('advancePayment')) || '0',
      notes:           get('notes')
    };

    const errs = [];
    if (!row.merchantName) errs.push('Merchant Name missing');
    if (!row.grossQty || isNaN(+row.grossQty) || +row.grossQty <= 0) errs.push('Invalid Gross Qty (must be positive)');
    if (!row.ratePerKg || isNaN(+row.ratePerKg) || +row.ratePerKg <= 0) errs.push('Invalid Rate (must be positive)');
    
    rows.push({ ...row, _row: i, _errors: errs });
  }
  return rows;
}


export default function CsvImportModal({ isOpen, onClose, onImportSuccess, apiMethod }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [parsed, setParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failedRows, setFailedRows] = useState({}); 

  if (!isOpen) return null;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a .csv file'); return; }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsedData = parseMerchantCSV(ev.target.result);
        setRows(parsedData);
        setParsed(true);
        if (parsedData.length === 0) toast.error('No valid rows found in CSV');
        else toast.success(`Found ${parsedData.length} row(s). Review before importing.`);
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
       
       // Ensure numbers are properly formatted just in case before sending to create payload
       const safePayload = {
         ...payload,
         grossQty: Number(payload.grossQty),
         lessPercent: Number(payload.lessPercent),
         fineLeaf: Number(payload.fineLeaf),
         ratePerKg: Number(payload.ratePerKg),
         labourHeadCount: Number(payload.labourHeadCount),
         labourCharge: Number(payload.labourCharge),
         advancePayment: Number(payload.advancePayment),
         // The backend date parser likes Date objects or ISO strings.
         transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date()
       };

       try {
         // Using apiMethod directly. In MerchantPage, it will be `merchantTxnAPI.create`
         await apiMethod(safePayload);
         ok++;
       } catch (err) {
         const backendErrors = err.response?.data?.errors;
         const backendMsg    = err.response?.data?.message;
         const errMsg = backendErrors
           ? backendErrors.map(e => `${e.path}: ${e.msg}`).join(' | ')
           : (backendMsg || err.message || 'Unknown error');
         console.error(`Row ${_row} FAILED:`, errMsg);
         newFailed[i] = errMsg;
       }
       setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    setFailedRows(newFailed);
    setImporting(false);
    
    const failCount = Object.keys(newFailed).length;
    if (ok) toast.success(`✅ Imported ${ok} record(s) successfully!`);
    if (failCount) toast.error(`❌ ${failCount} row(s) failed — see errors highlighted below.`);
    
    onImportSuccess();
    if (!failCount) handleClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'merchant_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setRows([]);
    setParsed(false);
    setProgress(0);
    setFailedRows({});
    onClose();
  };

  const validCount   = rows.filter(r => r._errors.length === 0).length;
  const invalidCount = rows.filter(r => r._errors.length >  0).length;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">upload_file</span>
            <div>
              <h3 className="text-lg font-bold">Import Merchant Transactions from CSV</h3>
              <p className="text-white/75 text-sm">Upload a CSV file to bulk-add procurement records</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File Picker controls */}
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

          {/* Format hint */}
          {!parsed && (
            <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4">
              <p className="text-sm font-semibold text-on-surface mb-2">Expected CSV columns:</p>
              <div className="flex flex-wrap gap-2">
                {CSV_HEADERS.map(h => (
                  <span key={h} className="px-2.5 py-1 bg-surface-container rounded-lg text-xs font-mono text-on-surface-variant">{h}</span>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-3">💡 Download the template above and fill it with your data. Column names are flexible (e.g. "Merchant Name", "merchantName", "name" all work).</p>
            </div>
          )}

          {/* Preview data table */}
          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/30">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">#</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Date</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Merchant</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Phone</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Gross Qty</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Less %</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Rate</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Advance</th>
                    <th className="px-3 py-3 text-on-surface-variant font-semibold uppercase">Status</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {rows.map((row, i) => {
                    const hasErr      = row._errors.length > 0;
                    const backendErr  = failedRows[i]; 
                    const rowClass    = hasErr ? 'bg-red-50' : backendErr ? 'bg-orange-50' : 'hover:bg-surface-container-lowest/40';
                    return (
                      <tr key={i} className={`transition-colors ${rowClass}`}>
                        <td className="px-3 py-3 text-on-surface-variant">{row._row}</td>
                        <td className="px-3 py-3 font-medium">{row.transactionDate || '—'}</td>
                        <td className="px-3 py-3 font-semibold text-on-surface">{row.merchantName || <span className="text-red-500">Missing</span>}</td>
                        <td className="px-3 py-3 text-on-surface-variant">{row.merchantPhone || '-'}</td>
                        <td className="px-3 py-3 text-right">{row.grossQty}</td>
                        <td className="px-3 py-3 text-right">{row.lessPercent}%</td>
                        <td className="px-3 py-3 text-right">₹{row.ratePerKg}</td>
                        <td className="px-3 py-3 text-right">₹{row.advancePayment}</td>
                        <td className="px-3 py-3 min-w-[120px]">
                          {hasErr
                            ? <span title={row._errors.join(', ')} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full cursor-help text-xs">⚠ {row._errors[0]}</span>
                            : backendErr
                              ? <span title={backendErr} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full cursor-help text-xs">⚠ Backend Error</span>
                              : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✓ Ready</span>
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
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="p-6 border-t border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between">
            <div className="flex-1 max-w-sm mr-4">
              {importing && (
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button onClick={handleClose} disabled={importing}
                className="px-6 py-2.5 rounded-xl font-semibold border border-outline-variant hover:bg-surface-container transition-all disabled:opacity-50">
                Cancel
              </button>
              <button 
                onClick={handleImport} 
                disabled={importing || validCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">publish</span>
                    Import {validCount} Record{validCount > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
