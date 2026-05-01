"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({ value, format, className, style }: AnimatedNumberProps) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 80, damping: 18, restDelta: 0.5 });
  const [display, setDisplay] = useState(() => format(value));
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => { mv.set(value); }, [value, mv]);
  useMotionValueEvent(spring, "change", (v) => setDisplay(formatRef.current(v)));

  return <span className={className} style={style}>{display}</span>;
}
