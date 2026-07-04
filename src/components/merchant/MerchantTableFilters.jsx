/**
 * MerchantTableFilters — search + filter toolbar for the transaction table.
 *
 * Props:
 *  search              – string
 *  filterType          – string (tea type filter)
 *  datePreset          – string ('', 'today', '5day', 'custom')
 *  onSearchChange      – (value: string) => void
 *  onFilterTypeChange  – (value: string) => void
 *  onDatePresetChange  – (value: string) => void
 */

const TEA_TYPES = ['Green Tea', 'CTC', 'Other'];

export default function MerchantTableFilters({
  search,
  filterType,
  datePreset,
  onSearchChange,
  onFilterTypeChange,
  onDatePresetChange,
}) {
  return (
    <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-3 items-center bg-surface-container-low/50">
      <h3 className="font-headline text-xl font-semibold text-primary flex-1">
        Procurement Management
      </h3>

      {/* Date range preset selector */}
      <select
        id="filter-date-preset"
        value={datePreset}
        onChange={(e) => onDatePresetChange(e.target.value)}
        className="px-3 py-2 bg-surface-container rounded-full border-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Select Date</option>
        <option value="today">Today</option>
        <option value="5day">5 Day</option>
        <option value="custom">Custom Date</option>
      </select>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
          search
        </span>
        <input
          id="search-merchant"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search merchant..."
          className="pl-9 pr-4 py-2 bg-surface-container rounded-full border-none text-sm w-52 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Tea type filter */}
      <select
        id="filter-tea-type"
        value={filterType}
        onChange={(e) => onFilterTypeChange(e.target.value)}
        className="px-3 py-2 bg-surface-container rounded-full border-none text-sm focus:outline-none"
      >
        <option value="">All Types</option>
        {TEA_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
