import { Trash2 } from "lucide-react";

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  title = "Confirmar exclusão",
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-primary-900 border border-primary-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1 ${danger ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-primary-500 to-primary-600"}`} />
        <div className="flex flex-col gap-4">
          <div className={`flex items-center gap-3 ${danger ? "text-red-400" : "text-primary-400"}`}>
            <div className={`p-2 rounded-lg ${danger ? "bg-red-500/10" : "bg-primary-500/10"}`}>
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          </div>
          <p className="text-gray-300 leading-relaxed text-sm">{message}</p>
          <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-primary-800">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-primary-600 text-gray-300 hover:bg-primary-700 transition-colors text-sm"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                danger
                  ? "bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                  : "bg-primary-600 text-white hover:bg-primary-500"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
