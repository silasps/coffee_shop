"use client";

import { useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 700;
const CLICK_VISIBLE_MS = 950;
const FALLBACK_HIDE_MS = 10000;

function isActionControl(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const control = target.closest(
    'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]',
  );

  if (!(control instanceof HTMLElement)) {
    return false;
  }

  if (control.closest('[data-global-action-feedback="off"]')) {
    return false;
  }

  if (
    control.hasAttribute("disabled") ||
    control.getAttribute("aria-disabled") === "true" ||
    control.getAttribute("type") === "reset"
  ) {
    return false;
  }

  return true;
}

export function GlobalActionFeedback() {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const clearFallbackTimer = () => {
      if (fallbackTimer.current) {
        window.clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };

    const show = () => {
      clearHideTimer();
      shownAt.current = Date.now();
      setVisible(true);
    };

    const hide = () => {
      clearFallbackTimer();
      const elapsed = Date.now() - shownAt.current;
      const delay = Math.max(MIN_VISIBLE_MS - elapsed, 0);

      clearHideTimer();
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        hideTimer.current = null;
      }, delay);
    };

    const scheduleFallbackHide = () => {
      clearFallbackTimer();
      fallbackTimer.current = window.setTimeout(() => {
        hide();
      }, FALLBACK_HIDE_MS);
    };

    const showForMoment = () => {
      show();
      clearFallbackTimer();
      fallbackTimer.current = window.setTimeout(() => {
        hide();
      }, CLICK_VISIBLE_MS);
    };

    const handleClick = (event: MouseEvent) => {
      if (isActionControl(event.target)) {
        showForMoment();
      }
    };

    const handleSubmit = () => {
      show();
      scheduleFallbackHide();
    };

    const handleManualShow = () => {
      show();
      scheduleFallbackHide();
    };

    const handleManualHide = () => {
      hide();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("global-action-feedback:show", handleManualShow);
    window.addEventListener("global-action-feedback:hide", handleManualHide);
    window.addEventListener("pagehide", hide);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("global-action-feedback:show", handleManualShow);
      window.removeEventListener("global-action-feedback:hide", handleManualHide);
      window.removeEventListener("pagehide", hide);
      clearHideTimer();
      clearFallbackTimer();
    };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`pointer-events-none fixed left-1/2 top-1/2 z-[120] -translate-x-1/2 -translate-y-1/2 transition duration-200 ${
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
    >
      <div
        role="status"
        className="flex min-w-[220px] items-center justify-center gap-3 rounded-2xl border border-white/70 bg-[rgba(40,21,14,0.92)] px-5 py-4 text-center text-sm font-semibold text-white shadow-[0_20px_60px_rgba(40,21,14,0.28)] backdrop-blur-md"
      >
        <span className="h-3 w-3 rounded-full border-2 border-white/35 border-t-white motion-safe:animate-spin" />
        <span>Em andamento...</span>
      </div>
    </div>
  );
}
