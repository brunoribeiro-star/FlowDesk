import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose?: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed z-[9999] top-6 right-6 px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-xl backdrop-blur-md transition-all animate-fade-in
      ${type === "success"
        ? "bg-green-500/10 border border-green-500/20 text-green-400"
        : "bg-red-500/10 border border-red-500/20 text-red-400"
      }`}
    >
      {type === "success"
        ? <CheckCircle2 size={16} />
        : <XCircle size={16} />
      }
      <span className="font-medium text-[14px]">{message}</span>
    </div>
  );
}
