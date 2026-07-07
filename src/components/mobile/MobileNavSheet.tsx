"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MobileNavSheetItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  danger?: boolean;
  onClick?: () => void;
}

interface MobileNavSheetProps {
  title: string;
  items: MobileNavSheetItem[];
  onClose: () => void;
}

// Height reserved by the floating bottom nav (bar + its own bottom offset),
// so the popover and its backdrop stop right above it instead of covering it.
const NAV_CLEARANCE = "calc(env(safe-area-inset-bottom, 0px) + 14px + 64px)";

export default function MobileNavSheet({ title, items, onClose }: MobileNavSheetProps) {
  const router = useRouter();

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  function handleSelect(item: MobileNavSheetItem) {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
    onClose();
  }

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-[65] lg:hidden animate-fade-in"
        style={{ bottom: NAV_CLEARANCE, background: "rgba(4,12,16,0.72)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 z-[75] flex justify-center px-4 lg:hidden"
        style={{ bottom: `calc(${NAV_CLEARANCE} + 10px)` }}
      >
        <div
          className="w-full max-w-md max-h-[60vh] overflow-y-auto rounded-[28px] border border-primary-600 bg-primary-800 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[17px] font-semibold text-gray-100">{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="grid place-items-center w-9 h-9 rounded-full border border-primary-600 text-gray-300 hover:text-gray-100 transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex flex-col px-3 pb-3">
            {items.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelect(item)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-colors ${
                  item.danger
                    ? "text-error-medium hover:bg-error-medium/10"
                    : "text-gray-100 hover:bg-primary-700"
                }`}
              >
                <item.icon size={20} className={item.danger ? "text-error-medium" : "text-primary-300"} />
                <span className="text-[15.5px] font-medium">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
