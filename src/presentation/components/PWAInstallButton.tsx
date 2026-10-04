import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
        title="Installer l'application Cadence"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-5 text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Installer sur iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Touchez le bouton <strong>Partager</strong> dans la barre Safari.
                <br />
                2. Faites défiler et touchez <strong>Sur l&apos;écran d&apos;accueil</strong>.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
