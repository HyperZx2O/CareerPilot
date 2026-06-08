"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ErrorOverlayProps {
  error: string | null;
  onDismiss: () => void;
}

export default function ErrorOverlay({ error, onDismiss }: ErrorOverlayProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border p-6 backdrop-blur-xl"
            style={{
              background: "rgba(15,15,25,0.85)",
              borderColor: "rgba(239,68,68,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(239,68,68,0.15)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: "var(--cp-danger)" }} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 text-sm" style={{ color: "var(--cp-text-muted)" }}>{error}</p>
              </div>
              <motion.button
                onClick={onDismiss}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}