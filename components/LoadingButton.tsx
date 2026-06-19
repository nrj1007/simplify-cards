"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingText = "Loading...",
  children,
  disabled,
  className = "",
  ...props
}: LoadingButtonProps) {
  return (
    <button
      aria-busy={loading}
      className={`loading-button ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="loading-button-spinner" /> : null}
      <span className="loading-button-label">{loading ? loadingText : children}</span>
    </button>
  );
}
