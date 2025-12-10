
'use client';

import { motion, Variants } from 'framer-motion';

interface AnimatedDockIconProps {
  children: React.ReactNode;
}

const iconVariants: Variants = {
  hover: {
    scale: 1.2,
    y: -4,
    filter: "drop-shadow(0px 8px 12px rgba(var(--primary-rgb), 0.3)) drop-shadow(0px 2px 4px rgba(0,0,0,0.1))",
    transition: { type: 'spring', stiffness: 300, damping: 15 }
  },
  initial: {
    scale: 1,
    y: 0,
    filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))"
  }
};

export function AnimatedDockIcon({ children }: AnimatedDockIconProps) {
  return (
    <motion.div
      variants={iconVariants}
      initial="initial"
      whileHover="hover"
      style={{
        textShadow: '0px 0px 8px rgba(255, 255, 255, 0)',
        '--icon-3d-offset-x': '1px',
        '--icon-3d-offset-y': '1px',
        '--icon-3d-color': 'rgba(0, 0, 0, 0.2)',
        filter: 'drop-shadow(var(--icon-3d-offset-x) var(--icon-3d-offset-y) 0px var(--icon-3d-color))'
      } as React.CSSProperties}
    >
      <motion.div
        animate={{
          color: [
            'hsl(var(--primary))', 
            'hsl(var(--accent))',
            'hsl(var(--primary))'
          ],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
