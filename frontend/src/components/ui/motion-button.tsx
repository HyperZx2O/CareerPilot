"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Button as ButtonPrimitive, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  className?: string;
}

export function MotionButton({
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}: MotionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export { ButtonPrimitive as Button, buttonVariants };