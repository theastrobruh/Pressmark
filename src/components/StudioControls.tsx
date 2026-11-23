import React from 'react';

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  hintLeft?: string;
  hintRight?: string;
  defaultValue?: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

export function StudioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  hintLeft,
  hintRight,
  defaultValue,
  onChange,
  onCommit,
}: StudioSliderProps) {
  const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(0.0001, max - min)) * 100));

  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
          {label}
        </span>
        <button
          type="button"
          title={defaultValue !== undefined ? 'Double-click to reset' : undefined}
          onDoubleClick={() => {
            if (defaultValue !== undefined) {
              onChange(defaultValue);
              onCommit?.();
            }
          }}
          className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono text-slate-200 tabular-nums cursor-default"
        >
          {displayValue ?? value}
        </button>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Track Background */}
        <div className="w-full h-1.5 rounded-full bg-[#090B0E] border border-white/[0.08] overflow-hidden pointer-events-none">
          <div
            style={{ width: `${pct}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
          />
        </div>
        {/* Visual Thumb */}
        <div
          style={{ left: `calc(${pct}% - 7px)` }}
          className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_0_2px_rgba(14,16,20,0.6)] group-hover:scale-110 transition-transform pointer-events-none"
        />
        {/* Invisible Native Range Input for Perfect Accessibility & Touch */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-y"
        />
      </div>

      {(hintLeft || hintRight) && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 -mt-1">
          <span>{hintLeft}</span>
          <span>{hintRight}</span>
        </div>
      )}
    </div>
  );
}

interface StudioSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function StudioSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: StudioSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-1.5 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group min-h-[40px]"
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{description}</div>
        )}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ${
          checked
            ? 'bg-blue-600 border-blue-400/50'
            : 'bg-[#090B0E] border-white/[0.15]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

export function StudioSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      className="grid gap-1 p-1 rounded-xl bg-[#090B0E] border border-white/[0.08]"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`min-h-[34px] px-2 py-1.5 rounded-lg text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-[#1D232E] text-white shadow-sm ring-1 ring-white/[0.1]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
