import React from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
}

export default function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed z-[9999] top-0 left-0 w-full py-4 text-center text-lg font-semibold shadow-lg backdrop-blur-md animate-slideDown
      ${
        type === "success"
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {message}
    </div>
  );
}
