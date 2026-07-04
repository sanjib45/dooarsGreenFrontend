/**
 * MerchantTransactionTable — renders the procurement transaction rows.
 *
 * Props:
 *  items           – array of transaction objects from the API
 *  loading         – boolean
 *  onViewDetails   – (item: object) => void  ← passes full item (for merchantName)
 *  onEdit          – (item: object) => void
 *  onDelete        – (id: string) => void
 */

const TABLE_HEADERS = [
  'Sl. No.', 'Date', 'Merchant', 'Type',
  'Gross Qty', 'Less %', 'Fine Leaf %', 'Net Qty', 'Rate/kg',
  'Gross Amt', 'Workers', 'Labor Total',
  'Advance', 'Balance', 'Action',
];

function BalanceBadge({ balance }) {
  if (balance > 0) return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-orange-100 text-orange-700">
      Amount Due
    </span>
  );
  if (balance < 0) return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-red-100 text-red-700">
      Overpaid
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-green-100 text-green-700">
      Paid
    </span>
  );
}

export default function MerchantTransactionTable({ items, loading, onViewDetails, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface border-y border-outline-variant/20 shadow-sm">
            {TABLE_HEADERS.map((h) => (
              <th key={h} className="px-4 py-3.5 text-on-surface-variant font-bold text-sm whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={TABLE_HEADERS.length} className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">
                  progress_activity
                </span>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={TABLE_HEADERS.length} className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl text-outline mb-3 block">
                  receipt_long
                </span>
                No transactions yet. Click &quot;New Transaction&quot; to get started.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={item._id}
                className="odd:bg-white even:bg-surface-container-lowest/50 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors text-on-surface"
              >
                <td className="px-4 py-4 text-on-surface-variant font-medium">{index + 1}</td>

                {/* Date */}
                <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                  <span className="block">
                    {new Date(item.transactionDate).toLocaleDateString('en-CA')}
                  </span>
                  <span className="text-xs">
                    {new Date(item.transactionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>

                <td className="px-4 py-4 font-semibold">{item.merchantName}</td>

                {/* Tea type badge */}
                <td className="px-4 py-4">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {item.teaType}
                  </span>
                </td>

                <td className="px-4 py-4 text-on-surface-variant">{item.grossQty} kg</td>
                <td className="px-4 py-4 text-on-surface-variant">{item.lessPercent > 0 ? `${item.lessPercent}%` : '—'}</td>
                <td className="px-4 py-4 text-on-surface-variant">{item.fineLeaf > 0 ? `${item.fineLeaf}%` : '—'}</td>
                <td className="px-4 py-4 font-medium">{item.netQty} kg</td>
                <td className="px-4 py-4 text-on-surface-variant">₹{item.ratePerKg}</td>
                <td className="px-4 py-4 font-medium">
                  ₹{(item.grossAmount || 0).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {item.laborCount} × ₹{item.laborChargePerWorker}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  ₹{(item.totalLaborCharges || 0).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">₹{item.advancePayment}</td>

                {/* Balance column */}
                <td className="px-4 py-4 text-center">
                  <span className="block text-sm font-bold text-on-surface mb-0.5">
                    ₹{(item.balance || 0).toLocaleString('en-IN')}
                  </span>
                  <BalanceBadge balance={item.balance} />
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      id={`details-${item._id}`}
                      onClick={() => onViewDetails(item)}
                      className="px-3 py-1.5 border border-[#3b4b59] text-[#3b4b59] rounded-lg text-xs font-semibold hover:bg-[#3b4b59]/5 transition-colors whitespace-nowrap"
                      title="View Merchant History"
                    >
                      View Details
                    </button>
                    <button
                      id={`edit-${item._id}`}
                      onClick={() => onEdit(item)}
                      className="px-3 py-1.5 border border-secondary text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/5 transition-colors whitespace-nowrap"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      id={`delete-${item._id}`}
                      onClick={() => onDelete(item._id)}
                      className="px-3 py-1.5 border border-error text-error rounded-lg text-xs font-semibold hover:bg-error/5 transition-colors whitespace-nowrap"
                      title="Cancel/Delete"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
