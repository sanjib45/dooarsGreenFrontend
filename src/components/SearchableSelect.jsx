/**
 * SearchableSelect — reusable autocomplete for Merchant / Buyer selection.
 *
 * Props:
 *   api          — { search(q), findOrCreate(data) } — the merchant or buyer API
 *   value        — current selected value: { _id, name, phone }
 *   onChange     — callback(selected) where selected = { _id, name, phone }
 *   placeholder  — input placeholder text
 *   label        — field label
 *   entityLabel  — "Merchant" | "Buyer" — used in "Add New" button text
 *   required     — boolean
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function SearchableSelect({
  api,
  value,
  onChange,
  placeholder = 'Search by name or phone...',
  label       = 'Select',
  entityLabel = 'Entity',
  required    = false,
}) {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [addForm,     setAddForm]     = useState({ name: '', phone: '', address: '' });
  const [addSaving,   setAddSaving]   = useState(false);
  const containerRef  = useRef(null);
  const debounceRef   = useRef(null);

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setShowAdd(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const { data } = await api.search(q);
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const handleInputChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0) doSearch(query);
  };

  // ── Select existing ───────────────────────────────────────────────────────────
  const handleSelect = (item) => {
    onChange(item);
    setQuery(`${item.name} · ${item.phone}`);
    setOpen(false);
    setShowAdd(false);
  };

  // ── Clear selection ───────────────────────────────────────────────────────────
  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // ── Add new entity ────────────────────────────────────────────────────────────
  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setAddSaving(true);
    try {
      const { data } = await api.findOrCreate(addForm);
      toast.success(data.isNew ? `New ${entityLabel} created!` : `${entityLabel} already exists — selected!`);
      handleSelect(data.data);
      setShowAdd(false);
      setAddForm({ name: '', phone: '', address: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${entityLabel}`);
    } finally {
      setAddSaving(false);
    }
  };

  const displayValue = value ? `${value.name} · ${value.phone}` : '';

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      {label && (
        <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 uppercase tracking-wider">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
          person_search
        </span>
        <input
          type="text"
          value={open ? query : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required && !value}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
        />
        {/* Clear / loading indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-on-surface-variant text-[18px]">progress_activity</span>
          ) : value ? (
            <button type="button" onClick={handleClear} className="text-on-surface-variant hover:text-error transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">expand_more</span>
          )}
        </div>
      </div>

      {/* Currently selected chip */}
      {value && !open && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
            {value.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-on-surface-variant">
            <strong className="text-on-surface">{value.name}</strong> · {value.phone}
            {value.address && ` · ${value.address}`}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-outline-variant/40 rounded-2xl shadow-xl shadow-primary/10 overflow-hidden max-h-72 flex flex-col">
          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {results.length === 0 && !loading && (
              <p className="text-center py-4 text-on-surface-variant text-sm">
                {query ? 'No results found' : 'Start typing to search...'}
              </p>
            )}
            {results.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors flex items-center gap-3 border-b border-outline-variant/10 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.phone}{item.address ? ` · ${item.address}` : ''}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Add new option */}
          {!showAdd ? (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setAddForm({ name: query, phone: '', address: '' }); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-outline-variant/20 bg-surface-container-lowest"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Add New {entityLabel}
            </button>
          ) : (
            <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest space-y-2">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Add New {entityLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="Full Name *" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required
                  className="px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="tel" placeholder="Phone *" value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} required
                  className="px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="text" placeholder="Address (optional)" value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleAddNew} disabled={addSaving}
                  className="flex-1 py-2 bg-gradient-to-r from-secondary to-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {addSaving ? 'Saving...' : `Save ${entityLabel}`}
                </button>
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface-variant hover:bg-surface-container">
                  Cancel
                </button>
              </div>
            </div>

          )}
        </div>
      )}
    </div>
  );
}
