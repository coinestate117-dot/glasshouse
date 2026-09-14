"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  formatter: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CountUp({
  end,
  duration = 600,
  formatter,
  className,
  style,
}: CountUpProps) {
  const [display, setDisplay] = useState(formatter(end));
  const hasAnimated = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setDisplay(formatter(end));
      return;
    }

    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(formatter(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [end, duration, formatter]);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}
