import React from 'react';
import { X } from 'lucide-react';

interface AndroidSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidSyncModal: React.FC<AndroidSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90">
      <div className="bg-slate-950 border-t border-b border-slate-800 max-w-md w-full py-6 px-4 relative text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-900">
          <h3 className="text-base font-medium text-slate-100">Guide pratique</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-900 text-xs text-slate-400 leading-relaxed">
          <div className="py-3">
            <strong className="text-slate-200 block mb-0.5">1. Pupitre du piano</strong>
            <span>Posez votre téléphone sur le pupitre de votre piano, écran face à vous.</span>
          </div>

          <div className="py-3">
            <strong className="text-slate-200 block mb-0.5">2. Écoute microphone</strong>
            <span>Autorisez le microphone. La note entendue s'affiche en direct sous la partition.</span>
          </div>

          <div className="py-3">
            <strong className="text-slate-200 block mb-0.5">3. Avancement note à note</strong>
            <span>La partition attend que vous jouiez la note cible pour passer au vert et avancer automatiquement.</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
