/**
 * MerchantTableFilters — search + filter toolbar for the transaction table.
 *
 * Props:
 *  search              – string (searches name OR phone)
 *  filterType          – string (tea type filter)
 *  datePreset          – string ('', 'today', '5day', 'custom')
 *  onSearchChange      – (value: string) => void
 *  onFilterTypeChange  – (value: string) => void
 *  onDatePresetChange  – (value: string) => void
 *  onClearAll          – () => void  (optional – clears all filters)
 */

const TEA_TYPES = ['Green Tea', 'CTC', 'Other'];

export default function MerchantTableFilters({
  search,
  filterType,
  datePreset,
  onSearchChange,
  onFilterTypeChange,
  onDatePresetChange,
  onClearAll,
}) {
  const hasActiveFilter = search || filterType || datePreset;

  return (
    <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
      <h3 className="font-headline text-xl font-semibold text-primary flex-1 min-w-[160px]">
        Procurement Management
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        {/* Combined search: name OR phone */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            id="search-merchant-name-phone"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name or phone…"
            title="Search by merchant name or phone number"
            className="pl-9 pr-4 py-2 bg-surface-container rounded-full border border-outline-variant/30 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Date range preset selector */}
        <select
          id="filter-date-preset"
          value={datePreset}
          onChange={(e) => onDatePresetChange(e.target.value)}
          className="px-3 py-2 bg-surface-container rounded-full border border-outline-variant/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">All Dates</option>
          <option value="today">Today</option>
          <option value="5day">Last 5 Days</option>
          <option value="custom">Custom Range…</option>
        </select>

        {/* Tea type filter */}
        <select
          id="filter-tea-type"
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="px-3 py-2 bg-surface-container rounded-full border border-outline-variant/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">All Types</option>
          {TEA_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Clear all filters */}
        {hasActiveFilter && onClearAll && (
          <button
            onClick={onClearAll}
            title="Clear all filters"
            className="flex items-center gap-1 text-error hover:bg-error/10 px-3 py-2 rounded-full text-xs font-semibold transition-colors border border-error/30"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
