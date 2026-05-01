"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function MouseGlow() {
  const rawX = useMotionValue(-800);
  const rawY = useMotionValue(-800);

  const x = useSpring(rawX, { damping: 22, stiffness: 28, mass: 0.6 });
  const y = useSpring(rawY, { damping: 22, stiffness: 28, mass: 0.6 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Primary cyan glow — follows cursor */}
      <motion.div
        style={{
          x,
          y,
          translateX: "-55%",
          translateY: "-55%",
          background: "radial-gradient(circle, rgba(0,212,255,0.055) 0%, rgba(0,120,200,0.02) 40%, transparent 70%)",
        }}
        className="absolute w-[800px] h-[800px] rounded-full blur-[110px]"
      />
      {/* Secondary blue glow — offset */}
      <motion.div
        style={{
          x,
          y,
          translateX: "-25%",
          translateY: "-75%",
          background: "radial-gradient(circle, rgba(0,80,200,0.04) 0%, transparent 65%)",
        }}
        className="absolute w-[500px] h-[500px] rounded-full blur-[90px]"
      />
    </div>
  );
}
