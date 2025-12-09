
'use client';

import { motion, Variants } from 'framer-motion';

interface AnimatedDockIconProps {
  children: React.ReactNode;
}

const iconVariants: Variants = {
  hover: {
    scale: 1.2,
    filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.3))",
    transition: { type: 'spring', stiffness: 300 }
  },
  initial: {
    scale: 1,
    filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))"
  }
};

export function AnimatedDockIcon({ children }: AnimatedDockIconProps) {
  return (
    <motion.div
      variants={iconVariants}
      initial="initial"
      whileHover="hover"
      animate={{
        color: [
          'hsl(217, 91%, 60%)', // Azul
          'hsl(260, 85%, 65%)', // Púrpura intermedio
          'hsl(0, 84%, 60%)',   // Rojo
          'hsl(260, 85%, 65%)', // Púrpura intermedio
          'hsl(217, 91%, 60%)'  // Vuelta al Azul
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
  );
}

