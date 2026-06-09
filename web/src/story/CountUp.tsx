import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  active: boolean;
  decimals?: number;
  duration?: number;
}

/** Zaehlt von 0 auf value hoch, sobald `active` true wird. */
export default function CountUp({ value, active, decimals = 0, duration = 1200 }: Props) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value, duration]);

  return (
    <>
      {new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display)}
    </>
  );
}
