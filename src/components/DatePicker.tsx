"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  id?: string;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function parseDate(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function formatDisplay(str: string): string {
  const parsed = parseDate(str);
  if (!parsed) return "";
  const { year, month, day } = parsed;
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  className = "",
  buttonClassName,
  disabled = false,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsed = parseDate(value);

  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(day: number) {
    const month = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    onChange(`${viewYear}-${month}-${dayStr}`);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSelected = (day: number) =>
    parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={buttonClassName ?? `
          w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
          bg-primary-900 border transition-colors text-left
          ${open ? "border-primary-500" : "border-primary-700 hover:border-primary-600"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          text-[14px]
        `}
      >
        <Calendar size={15} className="text-primary-400 shrink-0" />
        {value ? (
          <span className="flex-1 text-gray-100">{formatDisplay(value)}</span>
        ) : (
          <span className="flex-1 text-gray-500">{placeholder}</span>
        )}
        {value && !disabled && (
          <span
            role="button"
            onClick={handleClear}
            className="text-gray-600 hover:text-gray-300 transition-colors text-[16px] leading-none"
            title="Limpar data"
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0 min-w-[280px] rounded-2xl border border-primary-700 bg-primary-800 shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden"
          style={{ fontFamily: "inherit" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary-700">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-primary-700 transition-colors text-[16px]"
            >
              ‹
            </button>
            <span className="text-[14px] font-semibold text-gray-100">
              {MONTHS_PT[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-primary-700 transition-colors text-[16px]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 pt-2 pb-1">
            {WEEKDAYS_PT.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, i) =>
              day === null ? (
                <div key={`empty-${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`
                    flex items-center justify-center w-8 h-8 mx-auto rounded-lg text-[13px] font-medium transition-colors
                    ${isSelected(day)
                      ? "bg-primary-500 text-primary-900 font-bold"
                      : isToday(day)
                      ? "border border-primary-500 text-primary-300 hover:bg-primary-700"
                      : "text-gray-200 hover:bg-primary-700"
                    }
                  `}
                >
                  {day}
                </button>
              )
            )}
          </div>

          <div className="px-4 pb-3 pt-1 border-t border-primary-700/60 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const d = today;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${day}`);
                setOpen(false);
              }}
              className="text-[12px] text-primary-400 hover:text-primary-300 transition-colors"
            >
              Hoje
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[12px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
