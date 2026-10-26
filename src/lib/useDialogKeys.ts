"use client";

import { useEffect } from "react";

/** While a dialog is open: Esc closes it, the left and right arrows step through, and the page behind does not scroll. */
export function useDialogKeys(onClose: () => void, onStep: (d: number) => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onStep(1);
      if (e.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onStep]);
}
