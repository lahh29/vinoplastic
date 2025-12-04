'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export function AnimatedUserIcon() {
  return (
    <motion.div
      animate={{
        color: ['hsl(0 84.2% 60.2%)', 'hsl(217.2 91.2% 59.8%)', 'hsl(0 84.2% 60.2%)'],
      }}
      transition={{
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
      }}
    >
      <User className="h-5 w-5" />
    </motion.div>
  );
}
