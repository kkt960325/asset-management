"use client";

import { useRef, useCallback, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function TiltCard({ children, className = "", intensity = 4 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);

  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);

  // Softer spring → fewer layout thrashes when many cards are rendered simultaneously
  const springCfg = { stiffness: 160, damping: 22, mass: 0.8 };
  const rotateX = useSpring(useTransform(rawY, [0, 1], [intensity, -intensity]), springCfg);
  const rotateY = useSpring(useTransform(rawX, [0, 1], [-intensity, intensity]), springCfg);

  const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Capture coordinates synchronously before handing off to RAF
    const cx = e.clientX;
    const cy = e.clientY;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set((cx - rect.left) / rect.width);
      rawY.set((cy - rect.top) / rect.height);
    });
  }, [rawX, rawY]);

  const onMouseLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rawX.set(0.5);
    rawY.set(0.5);
  }, [rawX, rawY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, willChange: "transform" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
