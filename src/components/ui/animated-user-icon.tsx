'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export function AnimatedUserIcon() {
  return (
    <motion.div
      animate={{
        color: ['hsl(217.2 91.2% 59.8%)', 'hsl(280, 80%, 70%)', 'hsl(0, 84.2%, 60.2%)', 'hsl(280, 80%, 70%)', 'hsl(217.2 91.2% 59.8%)'],
      }}
      transition={{
        duration: 5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
    >
      <User className="h-6 w-6" />
    </motion.div>
  );
}
