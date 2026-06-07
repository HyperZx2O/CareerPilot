"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface MotionWrapperProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
}

export function MotionDiv({ children, ...props }: MotionWrapperProps) {
  return <motion.div {...props}>{children}</motion.div>;
}

export function MotionSection({ children, ...props }: MotionWrapperProps) {
  return <motion.section {...props}>{children}</motion.section>;
}

export function MotionSpan({ children, ...props }: Omit<HTMLMotionProps<"span">, "children"> & { children: ReactNode }) {
  return <motion.span {...props}>{children}</motion.span>;
}

// Stagger container component
export function StaggerContainer({
  children,
  className,
  delayChildren = 0.1,
  staggerChildren = 0.1,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, delay, ease: "easeOut" },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scroll reveal wrapper
export function ScrollReveal({
  children,
  className,
  threshold = 0.1,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: threshold }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Parallax container
export function ParallaxLayer({
  children,
  speed = 0.5,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: 0 }}
      style={{ willChange: "transform" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}