/**
 * MerchantPage — Procurement transactions (create / edit / delete / detail).
 *
 * Bugs fixed vs the original file:
 *  1. `handleChange` was completely missing → form fields were uncontrolled,
 *     onChange fired on a broken `editItem` that referenced `e` from closure.
 *  2. `submitting` state was used but never declared.
 *  3. `editItem` accidentally shadowed the handler and used wrong variable name.
 *  4. `setSubmitting` was called but not defined anywhere.
 *  5. Monolithic 570-line file is now split into focused, reusable components.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { merchantTxnAPI } from '../api/merchantTransactionApi';
import toast from 'react-hot-toast';

import ConfirmationModal from '../components/ConfirmationModal';
import MerchantProfileDrawer from '../components/merchant/MerchantProfileDrawer';
import MerchantStatCards from '../components/merchant/MerchantStatCards';
import MerchantTransactionForm from '../components/merchant/MerchantTransactionForm';
import MerchantTableFilters from '../components/merchant/MerchantTableFilters';
import MerchantTransactionTable from '../components/merchant/MerchantTransactionTable';
import CustomDateRangeModal from '../components/merchant/CustomDateRangeModal';

// ── Default empty form ────────────────────────────────────────────────────────
const emptyForm = {
  merchantName: '',
  merchantId:   '',
  merchantObj:  null,
  merchantPhone: '',
  teaType: '',
  transactionDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  grossQty: '',
  lessPercent: '',
  fineLeaf: '',
  ratePerKg: '',
  laborCount: '',
  laborChargePerWorker: '',
  advancePayment: '',
  notes: '',
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MerchantPage() {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [items, setItems]   = useState([]);
  const [stats, setStats]   = useState(null);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [form, setForm]           = useState(emptyForm);
  const [editing, setEditing]     = useState(null);   // _id string | null
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false); // ← was missing, now declared

  // ── UI / loading state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');

  // ── Custom date modal ─────────────────────────────────────────────────────────
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [tempDates, setTempDates] = useState({ start: '', end: '' });

  // ── Delete confirmation ───────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId]                   = useState(null);

  // ── Detail drawer — stores merchant name (not txn ID) so the profile drawer
  //    can load ALL transactions for that merchant in one view
  const [selectedMerchant, setSelectedMerchant] = useState(null);

  // ── Live calculation (client-side, no round-trip) ─────────────────────────────
  const calc = useMemo(() => merchantTxnAPI.compute(form), [form]);

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)     params.search    = search;
      if (filterType) params.teaType   = filterType;
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate   = endDate;

      const { data } = await merchantTxnAPI.getAll(params);
      setItems(data.data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await merchantTxnAPI.getStats();
      setStats(data.data);
    } catch {
      // silently ignore stats failure — page still works without them
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchStats();
  }, [fetchItems, fetchStats]);

  // ── Field change handler (the one that was COMPLETELY MISSING) ────────────────
  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Date preset handler ───────────────────────────────────────────────────────
  const handleDatePresetChange = (val) => {
    setDatePreset(val);

    if (val === '') {
      setStartDate('');
      setEndDate('');
    } else if (val === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
    } else if (val === '5day') {
      const today      = new Date();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(today.getDate() - 5);
      setStartDate(fiveDaysAgo.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (val === 'custom') {
      setTempDates({ start: startDate, end: endDate });
      setShowCustomDateModal(true);
    }
  };

  const handleCustomDateApply = () => {
    if (!tempDates.start || !tempDates.end) {
      toast.error('Please select both From and To dates');
      return;
    }
    setStartDate(tempDates.start);
    setEndDate(tempDates.end);
    setShowCustomDateModal(false);
  };

  const handleCustomDateReset = () => {
    setTempDates({ start: '', end: '' });
    setStartDate('');
    setEndDate('');
    setDatePreset('');
    setShowCustomDateModal(false);
  };

  const handleCustomDateCancel = () => {
    // Revert preset if user cancels without applying
    if (!startDate && !endDate) setDatePreset('');
    setShowCustomDateModal(false);
  };

  // ── Form submit (create / update) ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!form.merchantName.trim()) {
      toast.error('Merchant name is required');
      return;
    }
    if (!form.teaType) {
      toast.error('Please select a tea type');
      return;
    }
    if (!form.grossQty || Number(form.grossQty) <= 0) {
      toast.error('Gross quantity must be greater than 0');
      return;
    }
    if (!form.ratePerKg || Number(form.ratePerKg) <= 0) {
      toast.error('Rate per kg must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      // Send only raw inputs; the backend recalculates derived fields
      const payload = {
        merchantName:        form.merchantName.trim(),
        merchantId:          form.merchantId || undefined,
        merchantPhone:       form.merchantPhone?.trim() || undefined,
        teaType:             form.teaType,
        transactionDate:     form.transactionDate,
        grossQty:            Number(form.grossQty),
        lessPercent:         Number(form.lessPercent)         || 0,
        fineLeaf:            Number(form.fineLeaf)            || 0,
        ratePerKg:           Number(form.ratePerKg),
        laborCount:          Number(form.laborCount)          || 0,
        laborChargePerWorker: Number(form.laborChargePerWorker) || 0,
        advancePayment:      Number(form.advancePayment)      || 0,
        notes:               form.notes?.trim() || '',
      };

      if (editing) {
        await merchantTxnAPI.update(editing, payload);
        toast.success('Transaction updated!');
      } else {
        await merchantTxnAPI.create(payload);
        toast.success('Transaction recorded!');
      }

      // Reset form and close
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);

      // Refresh both table and stats
      fetchItems();
      fetchStats();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit handler ──────────────────────────────────────────────────────────────
  const handleEdit = (item) => {
    setForm({
      merchantName:         item.merchantName,
      merchantId:           item.merchant || '',
      merchantPhone:        '',
      merchantObj:          item.merchant ? { _id: item.merchant, name: item.merchantName, phone: '' } : null,
      teaType:              item.teaType,
      transactionDate:      item.transactionDate?.slice(0, 16) || '',
      grossQty:             String(item.grossQty),
      lessPercent:          String(item.lessPercent),
      fineLeaf:             String(item.fineLeaf || ''),
      ratePerKg:            String(item.ratePerKg),
      laborCount:           String(item.laborCount),
      laborChargePerWorker: String(item.laborChargePerWorker),
      advancePayment:       String(item.advancePayment),
      notes:                item.notes || '',
    });
    setEditing(item._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete handlers ───────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await merchantTxnAPI.remove(deleteId);
      toast.success('Transaction deleted');
      fetchItems();
      fetchStats();
    } catch {
      toast.error('Delete failed');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  // ── Cancel form ───────────────────────────────────────────────────────────────
  const cancelForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditing(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">Merchant</h1>
          <p className="text-on-surface-variant mt-1">
            Procurement transactions — track tea purchases and payments.
          </p>
        </div>
        <button
          id="btn-new-transaction"
          onClick={() => {
            if (showForm) {
              cancelForm();
            } else {
              setShowForm(true);
            }
          }}
          className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'New Transaction'}
        </button>
      </div>

      {/* ── Stats ── */}
      <MerchantStatCards stats={stats} />

      {/* ── Transaction Form (create / edit) ── */}
      {showForm && (
        <MerchantTransactionForm
          form={form}
          editing={editing}
          calc={calc}
          submitting={submitting}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
        />
      )}

      {/* ── Transaction Table ── */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
        <MerchantTableFilters
          search={search}
          filterType={filterType}
          datePreset={datePreset}
          onSearchChange={setSearch}
          onFilterTypeChange={setFilterType}
          onDatePresetChange={handleDatePresetChange}
          onClearAll={() => {
            setSearch('');
            setFilterType('');
            setDatePreset('');
            setStartDate('');
            setEndDate('');
          }}
        />

        <MerchantTransactionTable
          items={items}
          loading={loading}
          onViewDetails={(item) => setSelectedMerchant(item.merchantName)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            Showing {items.length} transaction{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
      />

      {/* ── Merchant Profile Drawer ── */}
      {selectedMerchant && (
        <MerchantProfileDrawer
          merchantName={selectedMerchant}
          onClose={() => setSelectedMerchant(null)}
          onDataChange={() => {
            fetchItems();
            fetchStats();
          }}
        />
      )}

      {/* ── Custom Date Range Modal ── */}
      <CustomDateRangeModal
        isOpen={showCustomDateModal}
        tempDates={tempDates}
        onChange={setTempDates}
        onApply={handleCustomDateApply}
        onReset={handleCustomDateReset}
        onCancel={handleCustomDateCancel}
      />
    </div>
  );
}
