import React, { useState, useRef, useEffect, useId } from 'react';

export interface AutocompleteOption<T = any> {
  id: string | number;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate' | 'rose';
  disabled?: boolean;
  disabledReason?: string;
  data: T;
}

interface SmartAutocompleteProps<T = any> {
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: T) => void;
  options: AutocompleteOption<T>[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  uppercase?: boolean;
  title?: string;
  minDropdownWidth?: string;
  emptyText?: string;
  showAllOnFocus?: boolean;
}

export function SmartAutocomplete<T = any>({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  className = '',
  inputClassName = '',
  disabled = false,
  uppercase = false,
  title,
  minDropdownWidth = 'min-w-[260px]',
  emptyText = 'Tidak ditemukan data cocok',
  showAllOnFocus = true,
}: SmartAutocompleteProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownId = useId();

  // Filter options based on query (support comma separated inputs)
  const rawValue = (value || '').trim();
  const lastToken = rawValue.includes(',')
    ? rawValue.split(',').pop()?.trim().toLowerCase() || ''
    : rawValue.toLowerCase();

  const query = lastToken;
  const filtered = query
    ? options.filter((opt) => {
        const lMatch = opt.label.toLowerCase().includes(query);
        const sMatch = opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false;
        const bMatch = opt.badge ? opt.badge.toLowerCase().includes(query) : false;
        return lMatch || sMatch || bMatch;
      })
    : showAllOnFocus
    ? options
    : [];

  // Limit display to top 25 items for performance
  const displayOptions = filtered.slice(0, 25);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < displayOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : displayOptions.length - 1));
    } else if (e.key === 'Enter') {
      if (displayOptions.length > 0) {
        e.preventDefault();
        const targetIdx = highlightIndex >= 0 ? highlightIndex : 0;
        const selected = displayOptions[targetIdx];
        if (selected && !selected.disabled) {
          handleChoose(selected);
        }
      }
    } else if (e.key === 'Tab') {
      if (isOpen && displayOptions.length > 0) {
        const targetIdx = highlightIndex >= 0 ? highlightIndex : 0;
        const selected = displayOptions[targetIdx];
        if (selected && !selected.disabled) {
          handleChoose(selected);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Jika ada nilai yang diketik, cocokkan otomatis jika tidak disabled
    if (value && value.trim()) {
      const trimmed = value.trim().toLowerCase();
      const exact = options.find((opt) => opt.label.trim().toLowerCase() === trimmed);
      if (exact && !exact.disabled) {
        onSelect(exact.data);
      } else if (displayOptions.length === 1 && trimmed.length >= 2 && !displayOptions[0].disabled) {
        onSelect(displayOptions[0].data);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const handleChoose = (opt: AutocompleteOption<T>) => {
    if (opt.disabled) return;
    onSelect(opt.data);
    setIsOpen(false);
    setHighlightIndex(0);
  };

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text: string, q: string) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <mark className="bg-amber-200 text-slate-900 rounded-2xs px-0.5 font-bold">
          {text.substring(idx, idx + q.length)}
        </mark>
        {text.substring(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        title={title}
        value={value}
        onChange={(e) => {
          const val = uppercase ? e.target.value.toUpperCase() : e.target.value;
          onChange(val);
          setIsOpen(true);
          setHighlightIndex(0);

          // Check if user typed an exact match
          const exact = options.find((opt) => opt.label.trim().toLowerCase() === val.trim().toLowerCase());
          if (exact && !exact.disabled) {
            onSelect(exact.data);
          }
        }}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
            setHighlightIndex(0);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
      />

      {/* Floating Suggestion Menu */}
      {isOpen && (
        <div
          id={dropdownId}
          className={`no-print absolute left-0 top-full mt-1 ${minDropdownWidth} max-w-sm sm:max-w-md w-max bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100`}
          style={{ minWidth: '100%' }}
        >
          {displayOptions.length > 0 ? (
            <ul ref={listRef} className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-100 text-xs">
              {displayOptions.map((opt, idx) => {
                const isSelected = idx === highlightIndex;
                const isOptDisabled = Boolean(opt.disabled);
                return (
                  <li
                    key={`${opt.id}-${idx}`}
                    onMouseEnter={() => !isOptDisabled && setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isOptDisabled) handleChoose(opt);
                    }}
                    onClick={() => !isOptDisabled && handleChoose(opt)}
                    className={`px-3 py-2 transition flex items-start justify-between gap-2 ${
                      isOptDisabled
                        ? 'bg-rose-50/50 text-slate-400 cursor-not-allowed opacity-75'
                        : isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-semibold cursor-pointer'
                        : 'hover:bg-slate-50 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        <span className={isOptDisabled ? 'line-through text-rose-800 font-bold' : ''}>
                          {renderHighlighted(opt.label, query)}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getBadgeStyle(
                              opt.badgeColor
                            )}`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <div
                          className={`text-[11px] mt-0.5 truncate leading-tight ${
                            isOptDisabled ? 'text-rose-600 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {renderHighlighted(opt.subLabel, query)}
                        </div>
                      )}
                    </div>
                    {isOptDisabled ? (
                      <span className="text-[10px] text-rose-600 font-extrabold self-center shrink-0 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                        ⛔ Tidak Bisa Dipakai
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold self-center shrink-0 opacity-70">
                        Pilih ↵
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-3 py-2.5 text-xs text-slate-500 italic text-center">
              {emptyText}
            </div>
          )}

          <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Gunakan panah ↑ ↓ lalu Enter</span>
            <span className="font-medium text-emerald-700">Auto-fill Otomatis</span>
          </div>
        </div>
      )}
    </div>
  );
}
