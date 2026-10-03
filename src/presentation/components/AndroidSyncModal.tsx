import React from 'react';
import { Smartphone, CheckCircle, Mic, BookOpen, X, Piano } from 'lucide-react';

interface AndroidSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidSyncModal: React.FC<AndroidSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Guide pratique au Piano</h3>
            <p className="text-xs text-slate-400">Conseils d'utilisation et d'écoute acoustique</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <Piano className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">1. Posez votre téléphone sur le pupitre</strong>
              <span>Placez votre smartphone au centre du pupitre à partition de votre piano acoustique ou numérique, écran face à vous.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <Mic className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">2. Activez l'écoute du micro</strong>
              <span>Cliquez sur le gros bouton jaune "Démarrer l'écoute". Autorisez l'accès micro si le navigateur le demande. Le niveau vert réagit dès qu'une touche résonne.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">3. Principe "Wait For Me" (Sans stress de tempo)</strong>
              <span>L'application ne vous presse jamais : le curseur attend patiemment sur la note affichée jusqu'à ce que vous jouiez la bonne touche sur votre piano. Dès qu'elle résonne, elle passe au vert et avance à la note suivante !</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white block font-semibold">4. Réglage de sensibilité</strong>
              <span>Si vous jouez doucement ou si le piano est feutré, sélectionnez "Haute". Si la pièce a un bruit de fond, choisissez "Basse".</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
        >
          C'est compris, jouer mon morceau !
        </button>
      </div>
    </div>
  );
};
