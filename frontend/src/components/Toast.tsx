import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastProps {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bg =
    type === "success"
      ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
      : type === "error"
      ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
      : "bg-blue-950/90 border-blue-500/40 text-blue-200";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${bg}`}
    >
      {type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
      <span className="text-sm font-medium pr-2">{message}</span>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};