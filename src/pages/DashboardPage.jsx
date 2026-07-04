/**
 * DashboardPage — Production-Ready
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-endpoint design: loads all data in one parallel request.
 * Sections:
 *  1. KPI Cards (8 live metrics)
 *  2. Due Alerts — who owes you money (merchants & buyers)
 *  3. Recent Merchant Procurement Table (last 8 entries)
 *  4. Recent Factory Sales Table (last 8 entries)
 */
import { useState, useEffect } from 'react';
import { dashboardAPI } from '../api/dashboardApi';
import { useNavigate } from 'react-router-dom';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtQty = (n) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// ── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">{label}</p>
        <span className={`material-symbols-outlined text-xl ${color} opacity-70`}>{icon}</span>
      </div>
      <div>
        <p className={`font-headline text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DueRow({ name, amount, rank }) {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500'];
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-outline-variant/10 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${colors[rank] || 'bg-surface-container'}`}>
          {rank + 1}
        </div>
        <span className="text-sm font-medium text-on-surface truncate">{name}</span>
      </div>
      <span className="font-bold text-sm text-red-600 shrink-0 ml-3">₹{fmt(amount)}</span>
    </div>
  );
}

function SectionHeader({ title, icon, count, linkLabel, onLink }) {
  return (
    <div className="p-5 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
      <div className="flex items-center gap-2 flex-1">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        <h3 className="font-headline text-lg font-semibold text-primary">{title}</h3>
        {count !== undefined && (
          <span className="ml-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
            {count} latest
          </span>
        )}
      </div>
      {linkLabel && (
        <button
          onClick={onLink}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {linkLabel}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      )}
    </div>
  );
}

// ── Merchant Recent Table ────────────────────────────────────────────────────
function MerchantTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl text-outline mb-3">inventory_2</span>
        <p className="text-sm">No merchant transactions yet.</p>
      </div>
    );
  }

  const TEA_COLORS = {
    'Green Tea': 'bg-green-100 text-green-700',
    'CTC':       'bg-amber-100 text-amber-700',
    'Other':     'bg-purple-100 text-purple-700',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface border-y border-outline-variant/20 shadow-sm">
            {['#', 'Transaction ID', 'Merchant', 'Tea Type', 'Net Qty (kg)', 'Final Payable (₹)', 'Balance (₹)', 'Date'].map(h => (
              <th key={h} className="px-4 py-3 text-on-surface-variant font-bold text-xs whitespace-nowrap uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => {
            const isSettled = (item.balance || 0) <= 0;
            return (
              <tr key={item._id} className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3.5 text-on-surface-variant font-medium">{i + 1}</td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {item.transactionId}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-semibold text-on-surface whitespace-nowrap">{item.merchantName}</td>
                <td className="px-4 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TEA_COLORS[item.teaType] || 'bg-surface-container text-on-surface-variant'}`}>
                    {item.teaType}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-medium">{fmtQty(item.netQty)} kg</td>
                <td className="px-4 py-3.5 text-right font-bold text-primary">₹{fmt(item.finalPayable)}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className={`font-bold text-sm ${isSettled ? 'text-green-600' : 'text-red-500'}`}>
                    {isSettled ? '✓ Settled' : `₹${fmt(item.balance)}`}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-on-surface-variant whitespace-nowrap">{fmtDate(item.transactionDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Factory Sales Recent Table ───────────────────────────────────────────────
function FactoryTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl text-outline mb-3">storefront</span>
        <p className="text-sm">No factory sales yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface border-y border-outline-variant/20 shadow-sm">
            {['#', 'Buyer', 'Date', 'Net Qty (kg)', 'Rate (₹/kg)', 'Total Amt (₹)', 'Advance (₹)', 'Paid (₹)', 'Due (₹)', 'Remarks'].map(h => (
              <th key={h} className="px-4 py-3 text-on-surface-variant font-bold text-xs whitespace-nowrap uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => {
            const isDue = (item.due || 0) > 0;
            return (
              <tr key={item._id} className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-secondary/5 transition-colors">
                <td className="px-4 py-3.5 text-on-surface-variant font-medium">{i + 1}</td>
                <td className="px-4 py-3.5 font-semibold text-on-surface whitespace-nowrap">{item.buyerName}</td>
                <td className="px-4 py-3.5 text-on-surface-variant whitespace-nowrap">{fmtDate(item.date)}</td>
                <td className="px-4 py-3.5 text-right font-semibold text-secondary">{fmtQty(item.netQty)} kg</td>
                <td className="px-4 py-3.5 text-right text-on-surface-variant">₹{fmt(item.rate)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-primary">₹{fmt(item.totalAmount)}</td>
                <td className="px-4 py-3.5 text-right text-on-surface-variant">₹{fmt(item.advance)}</td>
                <td className="px-4 py-3.5 text-right text-green-600 font-medium">₹{fmt(item.totalPaid)}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className={`font-bold ${isDue ? 'text-red-500' : 'text-green-600'}`}>
                    {isDue ? `₹${fmt(item.due)}` : '✓ Clear'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-on-surface-variant">
                  {item.remarks
                    ? <span className="px-2 py-0.5 bg-surface-container text-xs rounded-full">{item.remarks}</span>
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dashboardAPI.get()
      .then(res => { if (mounted) { setData(res.data.data); setLoading(false); } })
      .catch(err => { if (mounted) { setError(err.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
          <p className="text-on-surface-variant font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <p className="font-bold text-on-surface">Failed to load dashboard</p>
          <p className="text-sm text-on-surface-variant">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpi, merchantStats, factoryStats, recentMerchant, recentFactory, dueMerchants, dueBuyers } = data;

  return (
    <div className="space-y-8">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="font-headline text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-on-surface-variant mt-1 text-sm">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-sm text-green-500">fiber_manual_record</span>
          Live data
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Procurement"
          value={`₹${fmt(kpi.totalProcurementAmt)}`}
          sub={`${fmtQty(kpi.totalProcuredQty)} kg procured`}
          icon="grass"
          color="text-primary"
          onClick={() => navigate('/merchant')}
        />
        <KpiCard
          label="Total Factory Revenue"
          value={`₹${fmt(kpi.totalRevenue)}`}
          sub={`${fmtQty(kpi.totalSoldQty)} kg sold`}
          icon="storefront"
          color="text-secondary"
          onClick={() => navigate('/factory')}
        />
        <KpiCard
          label="Merchant Due"
          value={`₹${fmt(kpi.totalMerchantDue)}`}
          sub={`${kpi.totalMerchantTxns} transactions`}
          icon="account_balance_wallet"
          color={kpi.totalMerchantDue > 0 ? 'text-orange-600' : 'text-green-600'}
        />
        <KpiCard
          label="Factory Due"
          value={`₹${fmt(kpi.totalFactoryDue)}`}
          sub={`${kpi.totalFactorySales} sale records`}
          icon="payments"
          color={kpi.totalFactoryDue > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* ── Summary Strips ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Merchant Summary */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-primary/90 to-primary p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined">inventory_2</span>
              <h3 className="font-bold text-base">Merchant Procurement Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Gross Amt', v: `₹${fmt(merchantStats.totalGrossAmount)}` },
                { l: 'Final Payable', v: `₹${fmt(merchantStats.totalFinalPayable)}` },
                { l: 'Outstanding', v: `₹${fmt(merchantStats.totalBalance)}`, red: merchantStats.totalBalance > 0 },
              ].map(s => (
                <div key={s.l} className={`rounded-xl px-3 py-2 ${s.red ? 'bg-orange-500/80' : 'bg-white/15'}`}>
                  <p className="text-white/70 text-[10px]">{s.l}</p>
                  <p className="font-bold text-white text-sm">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Transactions',    v: merchantStats.totalTransactions },
              { l: 'Net Qty (kg)',    v: fmtQty(merchantStats.totalNetQty) },
              { l: 'Labor Charges',  v: `₹${fmt(merchantStats.totalLaborCharges)}` },
            ].map(s => (
              <div key={s.l}>
                <p className="font-bold text-on-surface text-base">{s.v}</p>
                <p className="text-on-surface-variant text-xs mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Factory Summary */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-secondary/90 to-secondary p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined">potted_plant</span>
              <h3 className="font-bold text-base">Factory Sales Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Total Revenue', v: `₹${fmt(factoryStats.totalAmount)}` },
                { l: 'Received',      v: `₹${fmt(factoryStats.totalPaid)}` },
                { l: 'Due',          v: `₹${fmt(factoryStats.totalDue)}`, red: factoryStats.totalDue > 0 },
              ].map(s => (
                <div key={s.l} className={`rounded-xl px-3 py-2 ${s.red ? 'bg-red-500/80' : 'bg-white/15'}`}>
                  <p className="text-white/70 text-[10px]">{s.l}</p>
                  <p className="font-bold text-white text-sm">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 grid grid-cols-3 gap-2 text-center">
            {[
              { l: 'Sale Records',  v: factoryStats.totalSales },
              { l: 'Net Qty (kg)', v: fmtQty(factoryStats.totalNetQty) },
              { l: 'Advance Paid', v: `₹${fmt(factoryStats.totalAdvance)}` },
            ].map(s => (
              <div key={s.l}>
                <p className="font-bold text-on-surface text-base">{s.v}</p>
                <p className="text-on-surface-variant text-xs mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Due Alerts ───────────────────────────────────────────────────── */}
      {(dueMerchants.length > 0 || dueBuyers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Merchants who have unpaid balance */}
          {dueMerchants.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant/20 flex items-center gap-2 bg-orange-50/50">
                <span className="material-symbols-outlined text-orange-500">warning</span>
                <h3 className="font-bold text-sm text-orange-700">Merchant Outstanding Dues</h3>
                <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                  {dueMerchants.length}
                </span>
              </div>
              <div className="p-4">
                {dueMerchants.map((m, i) => (
                  <DueRow key={m._id} name={m._id} amount={m.totalDue} rank={i} />
                ))}
              </div>
            </div>
          )}

          {/* Buyers with factory payment due */}
          {dueBuyers.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant/20 flex items-center gap-2 bg-red-50/50">
                <span className="material-symbols-outlined text-red-500">notifications_active</span>
                <h3 className="font-bold text-sm text-red-700">Buyer Payment Dues</h3>
                <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                  {dueBuyers.length}
                </span>
              </div>
              <div className="p-4">
                {dueBuyers.map((b, i) => (
                  <DueRow key={b._id} name={b._id} amount={b.totalDue} rank={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Merchant Procurement Table ────────────────────────────── */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-primary/5">
        <SectionHeader
          title="Recent Merchant Procurement"
          icon="inventory_2"
          count={recentMerchant.length}
          linkLabel="View All"
          onLink={() => navigate('/merchant')}
        />
        <MerchantTable rows={recentMerchant} />
        <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            Showing latest {recentMerchant.length} of {kpi.totalMerchantTxns} transactions
          </p>
          <button
            onClick={() => navigate('/merchant')}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* ── Recent Factory Sales Table ────────────────────────────────────── */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-xl shadow-secondary/5">
        <SectionHeader
          title="Recent Factory Sales"
          icon="potted_plant"
          count={recentFactory.length}
          linkLabel="View All"
          onLink={() => navigate('/factory')}
        />
        <FactoryTable rows={recentFactory} />
        <div className="p-4 bg-surface-container-lowest/30 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant">
            Showing latest {recentFactory.length} of {kpi.totalFactorySales} sale records
          </p>
          <button
            onClick={() => navigate('/factory')}
            className="text-xs text-secondary font-semibold hover:underline flex items-center gap-1"
          >
            View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

    </div>
  );
}
