"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Card as CardPrimitive } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { cardHover } from "@/lib/animations";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hoverEffect = true,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: "easeOut",
      }}
      whileHover={hoverEffect ? cardHover : undefined}
      className={cn("cursor-pointer", className)}
      {...props}
    >
      <CardPrimitive className="h-full">{children}</CardPrimitive>
    </motion.div>
  );
}

export function StaggerCard({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: "easeOut",
      }}
      whileHover={{ scale: 1.02 }}
      className={className}
    >
      <CardPrimitive className="h-full">{children}</CardPrimitive>
    </motion.div>
  );
}