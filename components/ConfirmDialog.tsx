"use client";

import type { Strings } from "@/lib/i18n";

// Small themed confirmation modal. Renders above other modals (z-60).
export default function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  L,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  L: Strings;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-3"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <p className="text-sm text-stone-800">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-stone-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3.5 py-1.5 text-sm rounded border border-stone-300 hover:bg-stone-50">
            {L.cancel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={
              "px-4 py-1.5 text-sm rounded text-white font-medium " +
              (danger ? "bg-red-700 hover:bg-red-800" : "bg-cyan-800 hover:bg-cyan-900")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
