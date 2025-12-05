"use client";

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const buttonClass =
    type === "danger"
      ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600";

  const iconWrapperClass =
    type === "danger" ? "bg-red-500/20" : "bg-orange-500/20";
  const iconColorClass =
    type === "danger" ? "text-red-400" : "text-orange-400";

  const handleBackgroundClick: React.MouseEventHandler<HTMLDivElement> = (
    e
  ) => {
    e.stopPropagation();
    onClose();
  };

  const handleCardClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4"
      onClick={handleBackgroundClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/70 p-5 sm:p-6 shadow-2xl"
        onClick={handleCardClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="text-center mb-5 sm:mb-6">
          <div
            className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${iconWrapperClass}`}
          >
            {type === "danger" ? (
              <svg
                className={`w-6 h-6 ${iconColorClass}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            ) : (
              <svg
                className={`w-6 h-6 ${iconColorClass}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <h3
            id="confirm-modal-title"
            className="text-lg sm:text-xl font-bold text-white mb-2"
          >
            {title}
          </h3>
          <p className="text-slate-300 text-sm sm:text-base">{message}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm sm:text-base text-slate-300 hover:text-white transition-colors rounded-full border border-slate-600 hover:border-slate-500"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 text-sm sm:text-base text-white rounded-full font-medium transition-all duration-200 hover:scale-[1.02] ${buttonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
