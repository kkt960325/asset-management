"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function MouseGlow() {
  const rawX = useMotionValue(-800);
  const rawY = useMotionValue(-800);

  // 매우 느리게 따라오는 스프링 (차분한 톤 유지)
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
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        className="absolute w-[900px] h-[900px] rounded-full bg-sky-500/[0.035] blur-[130px]"
      />
    </div>
  );
}
