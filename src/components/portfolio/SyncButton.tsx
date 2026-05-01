"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SyncButtonProps {
  onSync: () => void;
  loading: boolean;
  usingMock?: boolean;
}

export default function SyncButton({ onSync, loading, usingMock }: SyncButtonProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: "1.25rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      {/* Mock badge */}
      <AnimatePresence>
        {usingMock && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              padding: "0.2rem 0.45rem",
              border: "1px solid rgba(255,166,0,0.5)",
              borderRadius: "2px",
              color: "rgba(255,166,0,0.9)",
              background: "rgba(255,166,0,0.06)",
              backdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
          >
            MOCK DATA
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync button */}
      <motion.button
        onClick={onSync}
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.05 }}
        whileTap={{ scale: loading ? 1 : 0.95 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.85rem",
          border: "1px solid rgba(0,212,255,0.35)",
          borderRadius: "3px",
          background: loading
            ? "rgba(0,212,255,0.04)"
            : "rgba(0,212,255,0.08)",
          backdropFilter: "blur(12px)",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.65rem",
          letterSpacing: "0.15em",
          color: loading ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.9)",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
          outline: "none",
        }}
        aria-label="시세 동기화"
      >
        {/* Spinner or icon */}
        <motion.span
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={loading ? { repeat: Infinity, duration: 1.1, ease: "linear" } : { duration: 0 }}
          style={{ display: "inline-flex", lineHeight: 1 }}
        >
          ⟳
        </motion.span>
        {loading ? "SYNCING" : "SYNC"}
      </motion.button>
    </div>
  );
}
