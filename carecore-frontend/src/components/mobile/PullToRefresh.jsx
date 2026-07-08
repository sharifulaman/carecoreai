import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useMobile } from '@/lib/MobileContext';

/**
 * PullToRefresh - Wraps scrollable content with pull-to-refresh
 * 
 * Usage:
 * <PullToRefresh onRefresh={async () => { await fetchData(); }}>
 *   <YourListContent />
 * </PullToRefresh>
 */
export default function PullToRefresh({ children, onRefresh, threshold = 80 }) {
  const { isMobile } = useMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const scrollRef = useRef(null);

  const handleTouchStart = (e) => {
    const scrollTop = scrollRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (isRefreshing) return;

    const scrollTop = scrollRef.current?.scrollTop || 0;
    if (scrollTop !== 0) return;

    const distance = e.touches[0].clientY - startY.current;
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold + 20));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-y-auto overflow-x-hidden"
    >
      {/* Pull indicator */}
      {pullDistance > 0 && !isRefreshing && (
        <motion.div
          className="flex justify-center items-center pt-4 pb-4"
          style={{ height: pullDistance }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div animate={{ rotate: progress * 180 }} transition={{ duration: 0.2 }}>
            <RefreshCw className={`w-5 h-5 ${progress >= 1 ? 'text-primary' : 'text-muted-foreground'}`} />
          </motion.div>
        </motion.div>
      )}

      {/* Refreshing state */}
      {isRefreshing && (
        <div className="flex justify-center items-center py-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}