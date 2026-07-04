import { useState, useEffect, useCallback } from 'react';
import { paymentsAPI } from '../api/paymentsApi';
import toast from 'react-hot-toast';

const PAYMENT_TYPES = ['Salary', 'Advance', 'Bonus', 'Supplier', 'Other'];
const STATUSES = ['Pending', 'Completed', 'Failed'];
const empty = { payeeName: '', paymentType: '', amount: '', paymentDate: '', status: 'Pending', referenceId: '', notes: '' };

const statusStyle = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-secondary-container/30 text-on-secondary-container',
  'Failed': 'bg-red-100 text-red-800',
};

export default function PaymentsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.paymentType = filterType;
      const { data } = await paymentsAPI.getAll(params);
      setItems(data.data);
    } catch { toast.error('Failed to load payments data'); }
    setLoading(false);
  }, [search, filterType]);

  const fetchStats = async () => {
    try { const { data } = await paymentsAPI.getStats(); setStats(data.data); } catch {}
  };

  useEffect(() => { fetchItems(); fetchStats(); }, [fetchItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await paymentsAPI.update(editing, form); toast.success('Payment updated!'); }
      else { await paymentsAPI.create(form); toast.success('Payment created!'); }
      setForm(empty); setEditing(null); setShowForm(false);
      fetchItems(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed');
    }
  };

  const handleEdit = (item) => {
    setForm({ 
      payeeName: item.payeeName, 
      paymentType: item.paymentType, 
      amount: item.amount, 
      paymentDate: item.paymentDate?.slice(0, 10) || '', 
      status: item.status, 
      referenceId: item.referenceId || '', 
      notes: item.notes || '' 
    });
    setEditing(item._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payment record?')) return;
    try { await paymentsAPI.remove(id); toast.success('Deleted'); fetchItems(); fetchStats(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-headline text-3xl font-semibold text-primary">Payments & Payroll</h1>
          <p className="text-on-surface-variant mt-1">Manage salaries, supplier payments, and advances.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if(showForm){setForm(empty);setEditing(null);} }}
          className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95">
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'New Payment'}
        </button>
      </div>

      {/* Stats */}
      {stats?.summary && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {[
            { label: 'Total Transactions', value: stats.summary.totalTransactions, icon: 'receipt' },
            { label: 'Total Amount', value: `₹${stats.summary.totalAmount?.toLocaleString()}`, icon: 'account_balance_wallet' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-on-surface-variant text-sm font-semibold">{s.label}</p>
                <span className="material-symbols-outlined text-xl text-primary/60">{s.icon}</span>
              </div>
              <span className="font-headline text-2xl font-semibold text-primary">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="font-headline text-xl font-semibold text-primary mb-4">{editing ? 'Edit Payment' : 'Create New Payment'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name:'payeeName', label:'Payee Name *', type:'text', placeholder:'John Doe / Tea Co.' },
              { name:'amount', label:'Amount (₹) *', type:'number', placeholder:'0.00' },
              { name:'paymentDate', label:'Payment Date *', type:'date' },
              { name:'referenceId', label:'Reference ID', type:'text', placeholder:'TRX-001' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">{f.label}</label>
                <input name={f.name} type={f.type} value={form[f.name]} onChange={e => setForm({...form,[e.target.name]:e.target.value})}
                  required={f.label.includes('*')} placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all" />
              </div>
            ))}
            {[
              { name:'paymentType', label:'Payment Type *', opts:PAYMENT_TYPES },
              { name:'status', label:'Status', opts:STATUSES },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">{f.label}</label>
                <select name={f.name} value={form[f.name]} onChange={e => setForm({...form,[e.target.name]:e.target.value})} required={f.label.includes('*')}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all">
                  {!form[f.name] && <option value="">Select...</option>}
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea name="notes" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all resize-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" className="px-6 py-3 bg-gradient-to-br from-secondary to-primary text-white rounded-full font-semibold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95">
                {editing ? 'Update Payment' : 'Create Payment'}
              </button>
              <button type="button" onClick={() => {setShowForm(false);setForm(empty);setEditing(null);}}
                className="px-6 py-3 bg-surface-container text-on-surface rounded-full font-semibold text-sm hover:bg-surface-container-high transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
        <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
          <h3 className="font-headline text-xl font-semibold text-primary flex-1">Transaction History</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payee..."
              className="pl-9 pr-4 py-2 bg-surface-container rounded-full border-none text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)}
            className="px-3 py-2 bg-surface-container rounded-full border-none text-sm focus:outline-none">
            <option value="">All Types</option>
            {PAYMENT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface border-y border-outline-variant/20">
                {['Sl. No.', 'Payee', 'Type', 'Ref ID', 'Amount', 'Status', 'Date', 'Action'].map(h=>(
                  <th key={h} className="px-4 py-3.5 text-on-surface-variant font-bold text-sm whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl text-outline mb-2 block">payments</span>
                  No payments yet. Click "New Payment" to create one.
                </td></tr>
              ) : items.map((item, index) => (
                <tr key={item._id} className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface">
                  <td className="px-4 py-4 text-on-surface-variant font-medium">{index + 1}</td>
                  <td className="px-4 py-4 font-bold text-primary">{item.payeeName}</td>
                  <td className="px-4 py-4 text-on-surface-variant">{item.paymentType}</td>
                  <td className="px-4 py-4 text-on-surface-variant">{item.referenceId || '-'}</td>
                  <td className="px-4 py-4 font-bold text-primary">₹{item.amount?.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusStyle[item.status]||'bg-surface-variant text-on-surface-variant'}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    <span className="block">{new Date(item.paymentDate).toLocaleDateString('en-CA')}</span>
                    <span className="text-xs">{new Date(item.paymentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={()=>handleEdit(item)} className="px-3 py-1.5 border border-secondary text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/5 transition-colors whitespace-nowrap">Edit</button>
                      <button onClick={()=>handleDelete(item._id)} className="px-3 py-1.5 border border-error text-error rounded-lg text-xs font-semibold hover:bg-error/5 transition-colors whitespace-nowrap">Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">Showing {items.length} records</p>
        </div>
      </div>
    </div>
  );
}
