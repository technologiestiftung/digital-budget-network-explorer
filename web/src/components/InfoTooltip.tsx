import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipPosition {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "top" | "bottom";
}

const TOOLTIP_WIDTH = 280;
const VIEWPORT_PADDING = 12;
const GAP = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function InfoTooltip({ text }: { text: string }) {
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const icon = iconRef.current;
    if (!icon) return;

    const rect = icon.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const iconCenter = rect.left + rect.width / 2;
    const tooltipLeft = clamp(
      iconCenter - TOOLTIP_WIDTH / 2,
      VIEWPORT_PADDING,
      viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING,
    );

    // Approximation is enough for choosing the side; CSS can wrap text naturally.
    const estimatedHeight = 110;
    const hasRoomBelow = rect.bottom + GAP + estimatedHeight < viewportHeight - VIEWPORT_PADDING;
    const placement = hasRoomBelow ? "bottom" : "top";
    const top = placement === "bottom"
      ? rect.bottom + GAP
      : Math.max(VIEWPORT_PADDING, rect.top - GAP - estimatedHeight);

    setPosition({
      left: tooltipLeft,
      top,
      arrowLeft: clamp(iconCenter - tooltipLeft, 14, TOOLTIP_WIDTH - 14),
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={iconRef}
      className="info-icon-wrapper"
      onClick={(e) => e.preventDefault()}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      tabIndex={0}
      aria-label="Information"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
      {open && position && createPortal(
        <span
          className="info-tooltip"
          data-placement={position.placement}
          style={{
            left: position.left,
            top: position.top,
            "--tooltip-arrow-left": `${position.arrowLeft}px`,
          } as CSSProperties}
          role="tooltip"
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
}
