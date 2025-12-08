
"use client";
import React from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

// Make the component a forwardRef component
export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  return (
    <motion.button
      ref={ref} // Forward the ref to the button element
      whileHover={{ scale: 1.1, rotate: -5 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative inline-flex items-center justify-center p-2 overflow-hidden font-medium text-gray-600 transition duration-300 ease-out border-2 border-primary rounded-full shadow-md group",
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-primary group-hover:translate-x-0 ease">
        {children}
      </span>
      <span className="absolute flex items-center justify-center w-full h-full text-primary transition-all duration-300 transform group-hover:translate-x-full ease">
        {children}
      </span>
      <span className="relative invisible">{children}</span>
    </motion.button>
  );
});

// Assign a display name for better debugging
InteractiveHoverButton.displayName = "InteractiveHoverButton";
