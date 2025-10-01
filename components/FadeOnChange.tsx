// components/FadeOnChange.tsx
"use client";

import * as React from "react";

type Props = {
  deps: any[];
  duration?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Fades children out then in when any value in `deps` changes.
 * Respects `prefers-reduced-motion`.
 */
export default function FadeOnChange({
  deps,
  duration = 220,
  children,
  className,
  style,
}: Props) {
  const [opacity, setOpacity] = React.useState(1);

  // Respect prefers-reduced-motion
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReduce(!!mq?.matches);
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq?.addEventListener?.("change", handler);
    return () => mq?.removeEventListener?.("change", handler);
  }, []);

  React.useEffect(() => {
    if (reduce) return;
    // fade out then fade in on next frame
    setOpacity(0);
    const id = window.requestAnimationFrame(() => setOpacity(1));
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reduce]);

  return (
    <div
      className={className}
      style={{
        opacity: reduce ? 1 : opacity,
        transition: reduce ? undefined : `opacity ${duration}ms ease`,
        willChange: reduce ? undefined : "opacity",
        ...style,
      }}
    >
      {children}
    </div>
  );
}