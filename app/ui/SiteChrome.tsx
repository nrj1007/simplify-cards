"use client";

import type { Route } from "next";
import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Sparkle({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2C12 2 13.5 8.5 15 10C16.5 11.5 22 12 22 12C22 12 16.5 12.5 15 14C13.5 15.5 12 22 12 22C12 22 10.5 15.5 9 14C7.5 12.5 2 12 2 12C2 12 7.5 11.5 9 10C10.5 8.5 12 2 12 2Z" />
    </svg>
  );
}

export function FloatingAskButton() {
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      e.preventDefault();
      const container = document.getElementById("ask-widget-container");
      const input = container?.querySelector<HTMLInputElement>("input");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (input) {
        input.focus();
      }
      window.history.pushState(null, "", "/#ask-widget-container");
    }
  }

  return (
    <Link
      href={"/#ask-widget-container" as Route}
      onClick={handleClick}
      className="sc-floating-ask"
      aria-label="Ask SimplifyCards"
    >
      <span className="sc-floating-pulse" />
      <span className="sc-floating-sparkle">
        <Sparkle size={16} />
      </span>
      <span className="sc-floating-label">ask</span>
    </Link>
  );
}
