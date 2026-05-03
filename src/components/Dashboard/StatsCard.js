import { motion } from 'framer-motion';

export default function StatsCard({ title, value, icon, color = 'primary', delay = 0 }) {
  const colorMap = {
    primary: 'from-primary-500/20 to-primary-500/5 border-primary-500/30 text-primary-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/30 text-pink-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${colorMap[color].split(' ').pop()}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
}
