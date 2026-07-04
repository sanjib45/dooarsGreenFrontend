// Displays the 4 summary stat cards at the top of the Merchant page
function StatCard({ label, value, icon, highlight }) {
  return (
    <div className="glass-card p-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span className="material-symbols-outlined text-xl text-primary/60">{icon}</span>
      </div>
      <span className={`font-headline text-2xl font-bold ${highlight ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </span>
    </div>
  );
}

export default function MerchantStatCards({ stats }) {
  if (!stats?.summary) return null;

  const { totalTransactions, totalNetQty, totalGrossAmount, totalBalance } = stats.summary;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Total Transactions"
        value={totalTransactions ?? 0}
        icon="receipt_long"
      />
      <StatCard
        label="Net Qty Purchased"
        value={`${(totalNetQty || 0).toLocaleString()} kg`}
        icon="grass"
      />
      <StatCard
        label="Total Gross Amount"
        value={`₹${(totalGrossAmount || 0).toLocaleString('en-IN')}`}
        icon="payments"
        highlight
      />
      <StatCard
        label="Total Payable"
        value={`₹${(totalBalance || 0).toLocaleString('en-IN')}`}
        icon="account_balance_wallet"
      />
    </div>
  );
}
