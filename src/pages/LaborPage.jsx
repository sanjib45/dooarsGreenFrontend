/**
 * LaborPage — manage estate workforce with labor charges and payment status.
 *
 * Form fields: name, role, laborCharge, joinDate, notes
 * Table columns: Sl.No., Name, Role, Labor Charge, Payment Status, Join Date, Actions
 *
 * Key interactions:
 *  • "Mark as Paid" / "Mark as Due" button toggles paymentStatus via PATCH /labor/:id/pay
 *  • Payment status badge: orange "Due to Pay" | green "Paid"
 *  • Stats: Total Workers, Due to Pay (count + total amount), Paid
 */
import { useState, useEffect, useCallback } from 'react';
import { laborAPI } from '../api/laborApi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const ROLES = ['Plucker', 'Factory Worker', 'Supervisor', 'Maintenance', 'Other'];

const empty = {
  name:        '',
  role:        '',
  headCount:   '1',
  laborCharge: '',
  joinDate:    new Date().toISOString().slice(0, 10),
  notes:       '',
};

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Payment Status Badge ──────────────────────────────────────────────────────
function PayBadge({ status }) {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
        <span className="material-symbols-outlined text-xs">check_circle</span>
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700">
      <span className="material-symbols-outlined text-xs">pending</span>
      Due to Pay
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LaborPage() {
  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [form,    setForm]    = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [payingId,   setPayingId]   = useState(null); // which row is mid-toggle

  // Filters
  const [search,        setSearch]        = useState('');
  const [filterRole,    setFilterRole]    = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId,          setDeleteId]          = useState(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)        params.search        = search;
      if (filterRole)    params.role          = filterRole;
      if (filterPayment) params.paymentStatus = filterPayment;
      const { data } = await laborAPI.getAll(params);
      setItems(data.data);
    } catch {
      toast.error('Failed to load labor data');
    }
    setLoading(false);
  }, [search, filterRole, filterPayment]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await laborAPI.getStats();
      setStats(data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchItems(); fetchStats(); }, [fetchItems, fetchStats]);

  // ── Form submit (create / edit) ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())           { toast.error('Name is required'); return; }
    if (!form.role)                  { toast.error('Please select a role'); return; }
    if (!form.headCount || Number(form.headCount) < 1) {
      toast.error('Head count must be at least 1'); return;
    }
    if (form.laborCharge === '' || Number(form.laborCharge) < 0) {
      toast.error('Labor charge must be 0 or greater'); return;
    }
    try {
      const payload = {
        name:        form.name.trim(),
        role:        form.role,
        headCount:   Number(form.headCount),
        laborCharge: Number(form.laborCharge),
        joinDate:    form.joinDate,
        notes:       form.notes?.trim() || '',
      };
      if (editing) {
        await laborAPI.update(editing, payload);
        toast.success('Worker updated!');
      } else {
        await laborAPI.create(payload);
        toast.success('Worker added!');
      }
      setForm(empty); setEditing(null); setShowForm(false);
      fetchItems(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed');
    }
  };

  // ── Edit handler ────────────────────────────────────────────────────────────
  const handleEdit = (item) => {
    setForm({
      name:        item.name,
      role:        item.role,
      headCount:   String(item.headCount || 1),
      laborCharge: String(item.laborCharge),
      joinDate:    item.joinDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      notes:       item.notes || '',
    });
    setEditing(item._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Pay toggle ──────────────────────────────────────────────────────────────
  const handleTogglePay = async (item) => {
    setPayingId(item._id);
    try {
      const { data: res } = await laborAPI.togglePay(item._id);
      // Optimistically update the row in state
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? res.data : i))
      );
      fetchStats();
      toast.success(
        res.data.paymentStatus === 'Paid'
          ? `✓ ${item.name} marked as Paid`
          : `${item.name} marked as Due to Pay`
      );
    } catch {
      toast.error('Failed to update payment status');
    }
    setPayingId(null);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };

  const handleConfirmDelete = async () => {
    try {
      await laborAPI.remove(deleteId);
      toast.success('Worker deleted');
      fetchItems(); fetchStats();
    } catch {
      toast.error('Delete failed');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">Labor Management</h1>
          <p className="text-on-surface-variant mt-1">Track workers, labor charges, and payment status.</p>
        </div>
        <button
          onClick={() => {
            if (showForm) { setForm(empty); setEditing(null); }
            setShowForm(!showForm);
          }}
          className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Add Worker'}
        </button>
      </div>

      {/* ── Stats Cards ── */}
      {stats?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Workers',  value: stats.summary.totalWorkers,           icon: 'groups',              color: 'text-primary' },
            { label: 'Due to Pay',     value: stats.summary.dueWorkers,             icon: 'pending',             color: 'text-orange-600' },
            { label: 'Paid',           value: stats.summary.paidWorkers,            icon: 'check_circle',        color: 'text-green-600' },
            { label: 'Total Due (₹)',  value: `₹${fmt(stats.summary.totalDue)}`,    icon: 'account_balance_wallet', color: 'text-orange-600' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-on-surface-variant text-sm font-semibold">{s.label}</p>
                <span className={`material-symbols-outlined text-xl ${s.color} opacity-60`}>{s.icon}</span>
              </div>
              <span className={`font-headline text-2xl font-semibold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 mb-8 shadow-lg border border-primary/10">
          <h2 className="font-headline text-xl font-semibold text-primary mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">person_add</span>
            {editing ? 'Edit Worker' : 'Add New Worker'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Worker's full name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Role *
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              >
                {!form.role && <option value="">Select role...</option>}
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Head Count */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Head Count *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.headCount}
                onChange={(e) => setForm({ ...form, headCount: e.target.value })}
                placeholder="1"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Labor Charge */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Rate/Head (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.laborCharge}
                onChange={(e) => setForm({ ...form, laborCharge: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Join Date */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Join Date *
              </label>
              <input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-5">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Optional remarks..."
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="sm:col-span-2 lg:col-span-5 flex gap-3">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                {editing ? 'Update Worker' : 'Add Worker'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(empty); setEditing(null); }}
                className="px-6 py-3 bg-surface-container text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ── */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-primary/5">

        {/* Table header / filters */}
        <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
          <h3 className="font-headline text-xl font-semibold text-primary flex-1">Labor Records</h3>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name..."
              className="pl-9 pr-4 py-2 bg-surface-container rounded-full border-none text-sm w-44 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-full border-none text-sm focus:outline-none"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>

          {/* Payment status filter */}
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-full border-none text-sm focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="Due">Due to Pay</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface border-y border-outline-variant/20">
                {['Sl. No.', 'Name', 'Role', 'Head Count', 'Rate/Head (₹)', 'Total Payable', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-on-surface-variant font-bold text-sm whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl text-outline mb-2 block">groups</span>
                    No records yet. Click "Add Worker" to get started.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item._id}
                    className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface"
                  >
                    {/* Sl. No. */}
                    <td className="px-4 py-4 text-on-surface-variant font-medium">{index + 1}</td>

                    {/* Name */}
                    <td className="px-4 py-4">
                      <p className="font-bold text-primary">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[140px]">{item.notes}</p>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                        {item.role}
                      </span>
                    </td>

                    {/* Head Count */}
                    <td className="px-4 py-4 font-semibold text-on-surface">
                      {item.headCount || 1}
                    </td>

                    {/* Labor Charge */}
                    <td className="px-4 py-4 text-on-surface-variant">
                      ₹{fmt(item.laborCharge)}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-4 font-bold text-primary">
                      ₹{fmt(item.totalPayable || (item.headCount || 1) * item.laborCharge)}
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-4">
                      <PayBadge status={item.paymentStatus} />
                      <div className="text-[10px] text-on-surface-variant mt-1 ml-1">
                         {new Date(item.joinDate).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                         })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">

                        {/* Pay / Undo Pay toggle */}
                        {item.paymentStatus === 'Due' ? (
                          <button
                            onClick={() => handleTogglePay(item)}
                            disabled={payingId === item._id}
                            className="px-3 py-1.5 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
                          >
                            {payingId === item._id ? (
                              <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-xs">payments</span>
                            )}
                            Pay Now
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePay(item)}
                            disabled={payingId === item._id}
                            className="px-3 py-1.5 border border-orange-400 text-orange-600 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-60"
                          >
                            {payingId === item._id ? (
                              <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-xs">undo</span>
                            )}
                            Mark Due
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1.5 border border-secondary text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/5 transition-colors"
                        >
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="px-3 py-1.5 border border-error text-error rounded-lg text-xs font-semibold hover:bg-error/5 transition-colors"
                        >
                          Delete
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            Showing {items.length} record{items.length !== 1 ? 's' : ''}
          </p>
          {stats?.summary && (
            <p className="text-xs text-on-surface-variant">
              Total outstanding: <span className="font-bold text-orange-600">₹{fmt(stats.summary.totalDue)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Worker"
        message="Are you sure you want to delete this worker record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
      />
    </div>
  );
}
