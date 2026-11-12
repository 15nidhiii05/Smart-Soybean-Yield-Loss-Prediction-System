// Shared Framer Motion variants so every section animates the same way.
export const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
export const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 16 } } }
export const word = { hidden: { opacity: 0, y: 30, rotateX: -40 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { type: 'spring', stiffness: 110, damping: 14 } } }