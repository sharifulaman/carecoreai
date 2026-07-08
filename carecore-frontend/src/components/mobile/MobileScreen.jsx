import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobile } from '@/lib/MobileContext';
import { useLocation } from 'react-router-dom';

/**
 * MobileScreen - Wraps mobile pages with:
 * - Back button or logo header
 * - Slide-in/out animations
 * - Safe area insets
 * - Touch-optimized spacing
 * 
 * Usage:
 * <MobileScreen title="Screen Title" showBackButton={true}>
 *   <YourContent />
 * </MobileScreen>
 */
export default function MobileScreen({
  children,
  title,
  showBackButton = true,
  logo = null,
  onBack = null,
  headerClassName = '',
  contentClassName = '',
}) {
  const { isMobile, goBack, safeAreaTop, safeAreaBottom } = useMobile();
  const location = useLocation();
  const [isRootScreen, setIsRootScreen] = useState(false);

  useEffect(() => {
    // Detect root screens (no deep nesting in path)
    const pathDepth = location.pathname.split('/').filter(Boolean).length;
    setIsRootScreen(pathDepth <= 1);
  }, [location.pathname]);

  if (!isMobile) {
    // Desktop: render children without mobile wrapper
    return <>{children}</>;
  }

  const handleBack = onBack || goBack;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-background flex flex-col"
        style={{ paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }}
      >
        {/* Header */}
        <header
          className={`flex items-center justify-between px-4 py-3 border-b border-border bg-card ${headerClassName}`}
          style={{ minHeight: 'calc(44px + max(0px, env(safe-area-inset-top)))' }}
        >
          {showBackButton && !isRootScreen ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="w-10 h-10 -ml-2"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <div className="flex-1">{logo || <span className="font-semibold text-foreground">{title}</span>}</div>
          )}
          {title && !isRootScreen && (
            <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate px-3">
              {title}
            </h1>
          )}
          <div className="w-10" /> {/* Spacer for right-alignment balance */}
        </header>

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto ${contentClassName}`}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          {children}
        </main>
      </motion.div>
    </AnimatePresence>
  );
}