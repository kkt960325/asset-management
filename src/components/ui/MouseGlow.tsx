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
      {/* Green glow — centered at cursor */}
      <motion.div
        style={{ x, y, translateX: "-60%", translateY: "-50%" }}
        className="absolute w-[800px] h-[800px] rounded-full bg-[#00c389]/[0.05] blur-[130px]"
      />
      {/* Purple glow — offset upper-right */}
      <motion.div
        style={{ x, y, translateX: "-20%", translateY: "-70%" }}
        className="absolute w-[500px] h-[500px] rounded-full bg-[#485cc7]/[0.04] blur-[100px]"
      />
    </div>
  );
}
