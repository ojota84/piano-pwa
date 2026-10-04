import React, { useEffect, useState } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <span>Mode hors-ligne · Leçons disponibles sans connexion</span>
    </div>
  );
};
