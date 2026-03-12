import React from "react";
import { motion } from "framer-motion";

interface SpeedStreakProps {
  onComplete?: () => void;
}

const SpeedStreak: React.FC<SpeedStreakProps> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ left: "-100%" }}
      animate={{ left: "200%" }}
      transition={{ 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1], // Custom fast-out curve
      }}
      onAnimationComplete={onComplete}
      className="fixed top-0 bottom-0 w-screen h-screen z-[100] pointer-events-none flex flex-col justify-center"
    >
      {/* The main red streak */}
      <div className="h-6 w-full bg-f1-red shadow-[0_0_50px_rgba(225,6,0,0.8)] relative">
        {/* Glow trails */}
        <div className="absolute top-0 right-full h-full w-[100vw] bg-gradient-to-r from-transparent to-f1-red opacity-30" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[200vh] w-4 bg-f1-red/20 blur-xl" />
      </div>

      {/* Secondary white streak for contrast */}
      <div className="h-1 w-full bg-white/40 mt-2" />
    </motion.div>
  );
};

export default SpeedStreak;
