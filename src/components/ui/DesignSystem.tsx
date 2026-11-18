// ============================================================================
// TRADELINK V6.0 — DESIGN SYSTEM EXHAUSTIF (LES 25 COMPOSANTS UI - CHAPITRE 5.1)
// Conforme aux guides modern-web-guidance : dialog, responsive-table, tabs, dark-mode
// ============================================================================

import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  Search,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  HelpCircle,
  Inbox,
  Check,
} from 'lucide-react';

// 1. Button (ui/Button.tsx)
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'teal';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
  }
> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const variants = {
    primary:
      'bg-[#E85D22] hover:bg-[#D14B13] text-white shadow-sm shadow-orange-950/20 focus-visible:outline-[#E85D22]',
    teal:
      'bg-[#0B3438] hover:bg-[#134B51] text-white dark:bg-teal-700 dark:hover:bg-teal-600 shadow-sm focus-visible:outline-teal-500',
    secondary:
      'bg-white dark:bg-[#0E3A3F] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-teal-700/70 hover:bg-slate-50 dark:hover:bg-[#134B51]',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:outline-red-600',
    ghost:
      'bg-transparent hover:bg-slate-200/60 dark:hover:bg-teal-800/40 text-slate-700 dark:text-slate-200',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[34px]',
    md: 'px-4 py-2 text-sm rounded-xl gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5 min-h-[46px]',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

// 2. Input (ui/Input.tsx)
export const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    helperText?: string;
    onVoiceClick?: () => void;
  }
> = ({ label, error, helperText, onVoiceClick, className = '', id, ...rest }) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none focus:ring-2 focus:ring-[#E85D22]/25 ${
            onVoiceClick ? 'pe-10' : ''
          } ${error ? 'border-red-500' : ''} ${className}`}
          {...rest}
        />
        {onVoiceClick && (
          <button
            type="button"
            onClick={onVoiceClick}
            title="Activer la dictée vocale STT"
            aria-label="Activer la dictée vocale"
            className="absolute inset-inline-end-2 p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#E85D22] transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

// 3. InputVoice (ui/InputVoice.tsx)
export const InputVoice: React.FC<{
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onVoiceTrigger?: () => void;
}> = ({ label, value, onChange, placeholder, onVoiceTrigger }) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border ps-3.5 pe-11 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none"
        />
        <button
          type="button"
          onClick={onVoiceTrigger}
          title="Dictée vocale STT (FR/EN/AR)"
          aria-label="Activer la dictée vocale"
          className="absolute inset-inline-end-2 p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#E85D22] transition-colors"
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// 4. Textarea (ui/Textarea.tsx)
export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
    maxLengthCount?: number;
  }
> = ({ label, error, maxLengthCount, value, className = '', id, ...rest }) => {
  const autoId = useId();
  const areaId = id ?? autoId;
  const currentLen = typeof value === 'string' ? value.length : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={areaId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        {maxLengthCount && (
          <span className="text-[11px] text-slate-400">
            {currentLen}/{maxLengthCount}
          </span>
        )}
      </div>
      <textarea
        id={areaId}
        value={value}
        className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

// 5. Select (ui/Select.tsx)
export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    options: { value: string; label: string }[];
  }
> = ({ label, options, className = '', id, ...rest }) => {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// 6. Checkbox (ui/Checkbox.tsx)
export const Checkbox: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  asSwitch?: boolean;
}> = ({ label, checked, onChange, asSwitch = false }) => {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-medium select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...(asSwitch ? ({ switch: '' } as any) : {})}
        className="w-4 h-4 rounded accent-[#E85D22]"
      />
      <span>{label}</span>
    </label>
  );
};

// 7. RadioGroup (ui/RadioGroup.tsx)
export const RadioGroup: React.FC<{
  label?: string;
  name: string;
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (val: string) => void;
}> = ({ label, name, options, value, onChange }) => (
  <fieldset className="space-y-2">
    {label && <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</legend>}
    <div className="grid sm:grid-cols-3 gap-2.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`cursor-pointer p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
              active
                ? 'border-[#E85D22] bg-orange-500/10 font-bold'
                : 'border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0A292C]'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-[#E85D22]"
            />
            <div>
              <p>{opt.label}</p>
              {opt.description && <p className="text-[11px] text-slate-500 font-normal mt-0.5">{opt.description}</p>}
            </div>
          </label>
        );
      })}
    </div>
  </fieldset>
);

// 8. Modal (ui/Modal.tsx) — Native <dialog> element per modern-web-guidance 'dialog' guide
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}> = ({ open, onClose, title, children, maxWidthClass = 'max-w-2xl' }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      {...({ closedby: 'any' } as any)}
      className={`w-full ${maxWidthClass} rounded-2xl bg-white dark:bg-[#0B2E32] text-slate-900 dark:text-slate-100 p-0 shadow-2xl border border-slate-200 dark:border-teal-800 open:flex open:flex-col`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-teal-800/80">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-teal-900/60"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[80vh]">{children}</div>
    </dialog>
  );
};

// 9. Drawer (ui/Drawer.tsx)
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#09272A] h-full flex flex-col shadow-2xl border-s border-slate-200 dark:border-teal-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-teal-800 flex items-center justify-between bg-[#0B3438] text-white">
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            {subtitle && <p className="text-[11px] text-teal-200">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};

// 10. Toast (ui/Toast.tsx)
export const ToastNotification: React.FC<{
  toast: { text: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
}> = ({ toast }) => {
  if (!toast) return null;
  const styles = {
    success: 'bg-emerald-900/95 text-emerald-50 border-emerald-500',
    error: 'bg-red-900/95 text-red-50 border-red-500',
    warning: 'bg-amber-900/95 text-amber-50 border-amber-500',
    info: 'bg-[#0B3438]/95 text-white border-[#E85D22]',
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-5 inset-inline-end-5 z-50 max-w-md px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${styles[toast.type]}`}
    >
      {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
      {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
      {toast.type === 'info' && <Info className="w-5 h-5 text-orange-400 shrink-0" />}
      <span className="text-xs font-medium leading-relaxed">{toast.text}</span>
    </div>
  );
};

// 11. Tooltip (ui/Tooltip.tsx)
export const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({
  text,
  children,
}) => (
  <span className="relative group inline-flex items-center">
    {children}
    <span
      role="tooltip"
      className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute bottom-full mb-1.5 inset-inline-start-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] whitespace-nowrap shadow-lg z-40"
    >
      {text}
    </span>
  </span>
);

// 12. Badge (ui/Badge.tsx) — Couleur + point visuel + texte (Accessibilité WCAG 1.4.1)
export const Badge: React.FC<{
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange';
  children: React.ReactNode;
}> = ({ variant = 'neutral', children }) => {
  const map = {
    success:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    warning:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    danger: 'bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30',
    info: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    orange:
      'bg-orange-500/15 text-[#E85D22] dark:text-orange-300 border-orange-500/30',
    neutral:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[variant]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
};

// 13. Card (ui/Card.tsx)
export const Card: React.FC<{
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className = '' }) => (
  <div
    className={`rounded-2xl bg-white dark:bg-[#0B2D31] border border-slate-200/90 dark:border-teal-800/70 shadow-sm overflow-hidden ${className}`}
  >
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-teal-800/60">
        <div>
          {title && <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

// 15. Pagination (ui/Pagination.tsx)
export const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-3 text-xs">
      <span className="text-slate-500">
        Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong>
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          Précédent
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Suivant
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
};

// 20. Skeleton (ui/Skeleton.tsx)
export const Skeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div className={`space-y-3 animate-pulse ${className}`} aria-busy="true" aria-label="Chargement en cours">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-12 rounded-xl bg-slate-200/80 dark:bg-teal-900/50 w-full"
      />
    ))}
  </div>
);

// 21. EmptyState (ui/EmptyState.tsx)
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="py-10 px-4 text-center space-y-3 rounded-2xl bg-slate-50/70 dark:bg-[#082225]/60 border border-dashed border-slate-300 dark:border-teal-800">
    <Inbox className="w-10 h-10 mx-auto text-slate-400 dark:text-teal-500" />
    <div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">{description}</p>}
    </div>
    {actionLabel && onAction && (
      <Button size="sm" variant="primary" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

// 14. DataTable (ui/DataTable.tsx) — Tri, pagination, chargement Skeleton, erreur, EmptyState & responsive
export function DataTable<T>({
  caption,
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Aucune donnée disponible pour ce filtre',
  loading = false,
  error = null,
  pageSize = 10,
}: {
  caption: string;
  columns: {
    key: string;
    header: string;
    isRowHeader?: boolean;
    render: (row: T) => React.ReactNode;
  }[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  pageSize?: number;
}) {
  const captionId = useId();
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);

  if (loading) {
    return <Skeleton rows={4} />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">Erreur lors du chargement des données</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyMessage} description="Modifiez vos critères de recherche ou ajoutez un nouvel enregistrement." />;
  }

  const orderedData = sortAsc ? data : [...data].reverse();
  const totalPages = Math.max(1, Math.ceil(orderedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = orderedData.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="tradelink-table-wrapper rounded-xl border border-slate-200 dark:border-teal-800/70"
      >
        <table className="tradelink-table tradelink-table-responsive text-sm text-start">
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
          <thead className="bg-slate-100 dark:bg-[#082225] text-xs uppercase text-slate-600 dark:text-slate-300">
            <tr>
              {columns.map((col, idx) => (
                <th key={col.key} scope="col" className="px-4 py-3 font-semibold text-start">
                  {idx === 0 ? (
                    <button
                      type="button"
                      onClick={() => setSortAsc(!sortAsc)}
                      className="inline-flex items-center gap-1.5 hover:text-[#E85D22]"
                    >
                      <span>{col.header}</span>
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-teal-800/50 bg-white dark:bg-[#0B2D31]">
            {pagedData.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-slate-50/80 dark:hover:bg-teal-900/30 transition-colors"
              >
                {columns.map((col, idx) =>
                  col.isRowHeader || idx === 0 ? (
                    <th
                      key={col.key}
                      scope="row"
                      className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white bg-white dark:bg-[#0B2D31] text-start"
                    >
                      {col.render(row)}
                    </th>
                  ) : (
                    <td
                      key={col.key}
                      data-label={col.header}
                      className="px-4 py-3.5 text-slate-700 dark:text-slate-200"
                    >
                      {col.render(row)}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

// 16. Tabs (ui/Tabs.tsx) — Conforme au guide 'tabs'
export const Tabs: React.FC<{
  ariaLabel: string;
  tabs: { id: string; label: string; badge?: string | number }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ ariaLabel, tabs, activeTab, onChange }) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    {...({ focusgroup: 'tablist nomemory' } as any)}
    className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-teal-800/80 pb-px"
  >
    {tabs.map((tab) => {
      const selected = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={selected}
          {...(selected ? ({ focusgroupstart: '' } as any) : {})}
          onClick={() => onChange(tab.id)}
          className="px-4 py-2.5 text-sm font-medium whitespace-nowrap flex items-center gap-2 text-slate-600 dark:text-slate-300 aria-selected:text-[#E85D22] dark:aria-selected:text-orange-400 transition-colors"
        >
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-teal-900">
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// 17. Stepper (ui/Stepper.tsx)
export const Stepper: React.FC<{
  steps: { id: string; label: string; description?: string }[];
  currentStepIndex: number;
  onStepClick?: (idx: number) => void;
}> = ({ steps, currentStepIndex, onStepClick }) => (
  <ol className="grid sm:grid-cols-3 gap-3 text-xs">
    {steps.map((st, idx) => {
      const done = idx < currentStepIndex;
      const active = idx === currentStepIndex;
      return (
        <li
          key={st.id}
          onClick={() => onStepClick?.(idx)}
          className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
            onStepClick ? 'cursor-pointer' : ''
          } ${
            active
              ? 'border-[#E85D22] bg-orange-500/10 font-bold'
              : done
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-slate-200 dark:border-teal-800 bg-slate-50 dark:bg-[#082225] opacity-70'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 ${
              done
                ? 'bg-emerald-600 text-white'
                : active
                ? 'bg-[#E85D22] text-white'
                : 'bg-slate-200 dark:bg-teal-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            {done ? <Check className="w-4 h-4" /> : idx + 1}
          </span>
          <div>
            <p className="font-bold">{st.label}</p>
            {st.description && <p className="text-[11px] text-slate-500 font-normal">{st.description}</p>}
          </div>
        </li>
      );
    })}
  </ol>
);

// 18. Breadcrumb (ui/Breadcrumb.tsx)
export const Breadcrumb: React.FC<{
  items: { label: string; to?: string }[];
}> = ({ items }) => (
  <nav aria-label="Fil d'Ariane" className="text-xs text-slate-500 dark:text-slate-400">
    <ol className="flex flex-wrap items-center gap-1.5">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li key={idx} className="inline-flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-[#E85D22] font-medium transition-colors">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className="font-bold text-slate-800 dark:text-slate-100">
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 opacity-50 rtl:rotate-180" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

// 19. Avatar (ui/Avatar.tsx)
export const Avatar: React.FC<{
  initials: string;
  status?: 'online' | 'busy' | 'offline';
  size?: 'sm' | 'md' | 'lg';
}> = ({ initials, status = 'online', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  const statusColors = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500',
    offline: 'bg-slate-400',
  };
  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`${sizes[size]} rounded-xl bg-[#E85D22] text-white font-bold flex items-center justify-center shadow-xs`}
      >
        {initials}
      </div>
      <span
        className={`absolute -bottom-0.5 -inset-inline-end-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#09272A] ${statusColors[status]}`}
      />
    </div>
  );
};

// 22. FileUploader (ui/FileUploader.tsx)
export const FileUploader: React.FC<{
  label: string;
  acceptedFormats?: string;
  maxSizeMb?: number;
  onFileSelect: (fileName: string) => void;
}> = ({
  label,
  acceptedFormats = 'PDF, PNG, JPG, SQL, BAK, DBF, CSV, XLSX',
  maxSizeMb = 50,
  onFileSelect,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-teal-700/70 hover:border-[#E85D22] dark:hover:border-orange-400 p-6 text-center transition-colors bg-slate-50/50 dark:bg-[#082225]/50"
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f.name);
        }}
      />
      <Upload className="w-8 h-8 mx-auto text-[#E85D22] mb-2" />
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Formats autorisés : {acceptedFormats} (Max {maxSizeMb} Mo) • Scan Antivirus & SHA-256 actifs
      </p>
    </div>
  );
};

// 23. DatePicker (ui/DatePicker.tsx)
export const DatePicker: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
  <Input label={label} type="date" value={value} onChange={(e) => onChange(e.target.value)} />
);

// 24. SearchBar (ui/SearchBar.tsx)
export const SearchBar: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Rechercher une référence, SKU, commande, dossier KYC...' }) => (
  <div className="relative flex items-center w-full">
    <Search className="w-4 h-4 text-slate-400 absolute inset-inline-start-3.5 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full ps-10 pe-9 py-2 text-sm rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 focus:border-[#E85D22] focus:outline-none"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
        className="absolute inset-inline-end-2.5 p-1 text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

// 25. ConfirmDialog (ui/ConfirmDialog.tsx)
export const ConfirmDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}> = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmer l’opération' }) => (
  <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
    <div className="space-y-4 text-xs">
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <HelpCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="leading-relaxed">{description}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} autoFocus>
          Annuler
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
