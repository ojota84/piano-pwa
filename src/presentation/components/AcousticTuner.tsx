import React, { useState, useEffect, useRef } from 'react';
import { PitchResult } from '../../core/models/pitch.types.ts';
import { Mic, Activity, Sliders, AlertTriangle, History } from 'lucide-react';

interface AcousticTunerProps {
  isListening: boolean;
  onToggleListening: () => void;
  onResumeAudio: () => void;
  currentPitch: PitchResult | null;
  targetPitch: string;
  onSetSensitivity: (val: number) => void;
  onSetGain: (val: number) => void;
}

interface DspStateRecord {
  id: string;
  time: string;
  note: string;
  frequency: string;
  confidence: number;
  rms: number;
  message: string;
  isPitched: boolean;
}

export const AcousticTuner: React.FC<AcousticTunerProps> = ({
  isListening,
  onToggleListening,
  onResumeAudio,
  currentPitch,
  targetPitch,
  onSetSensitivity,
  onSetGain,
}) => {
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [sensitivityPreset, setSensitivityPreset] = useState<'high' | 'normal' | 'low'>('normal');

  // Rolling history of the last 2 distinct DSP states for readable inspection
  const [dspHistory, setDspHistory] = useState<DspStateRecord[]>([]);
  const lastStateSummaryRef = useRef<string>('');

  useEffect(() => {
    if (!currentPitch) return;

    const summary = currentPitch.isPitched
      ? `${currentPitch.solfegeName} ${currentPitch.octave}`
      : currentPitch.debugMessage?.startsWith('Silence')
      ? 'Silence'
      : currentPitch.debugMessage || 'bruit';

    if (summary !== lastStateSummaryRef.current) {
      lastStateSummaryRef.current = summary;
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);

      const record: DspStateRecord = {
        id: Math.random().toString(),
        time: timeStr,
        note: currentPitch.isPitched ? `${currentPitch.solfegeName} ${currentPitch.octave}` : 'Silence / Bruit',
        frequency: currentPitch.isPitched ? `${currentPitch.frequency.toFixed(1)} Hz` : '0 Hz',
        confidence: Math.round(currentPitch.confidence * 100),
        rms: currentPitch.rms,
        message: currentPitch.debugMessage || '',
        isPitched: currentPitch.isPitched,
      };

      setDspHistory((prev) => [record, ...prev.slice(0, 1)]);
    }
  }, [currentPitch]);

  const isPitched = currentPitch?.isPitched ?? false;
  const solfege = isPitched ? `${currentPitch!.solfegeName} ${currentPitch!.octave}` : '---';
  const frequency = isPitched ? currentPitch!.frequency.toFixed(1) : '0.0';
  const cents = isPitched ? currentPitch!.cents : 0;
  const isMatch = isPitched && solfege === targetPitch;

  // Responsive volume RMS visual bar (normalized 0 to 100%)
  const rawRms = currentPitch?.rms ?? 0;
  const volumePercent = Math.min(100, Math.round(rawRms * 1600));

  const audioState = currentPitch?.audioState ?? (isListening ? 'running' : 'inactive');

  const handleSensitivity = (preset: 'high' | 'normal' | 'low') => {
    setSensitivityPreset(preset);
    if (preset === 'high') {
      onSetSensitivity(0.001);
      onSetGain(3.8);
    } else if (preset === 'normal') {
      onSetSensitivity(0.0025);
      onSetGain(2.5);
    } else {
      onSetSensitivity(0.005);
      onSetGain(1.5);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg text-slate-200">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md ${
              isListening
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 animate-pulse'
            }`}
          >
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
                <Mic className="w-4 h-4" />
                <span>Microphone Actif (Écoute en cours)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Démarrer l'écoute du piano</span>
              </>
            )}
          </button>

          {/* Suspended AudioContext Alert */}
          {isListening && audioState === 'suspended' && (
            <button
              onClick={onResumeAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Toucher pour réactiver l'audio</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Diagnostics */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showDebug
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Afficher/Masquer le panneau de diagnostic"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Pitch Display */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
        {/* Detected Solfège Note */}
        <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
            Note entendue par le micro
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight transition-colors ${
                isMatch
                  ? 'text-emerald-400'
                  : isPitched
                  ? 'text-amber-400'
                  : 'text-slate-600'
              }`}
            >
              {solfege}
            </span>
            {isPitched && (
              <span className="text-xs text-slate-400 font-mono">
                {frequency} Hz
              </span>
            )}
          </div>
        </div>

        {/* Cents Gauge & Live Volume VU-Meter */}
        <div className="flex flex-col items-center justify-center p-2">
          {/* Live Microphone Volume VU-Meter */}
          <div className="w-full mb-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>Niveau micro en direct :</span>
              </span>
              <span className="font-mono text-emerald-400">{volumePercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  volumePercent > 20
                    ? 'bg-emerald-400'
                    : volumePercent > 5
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${volumePercent}%` }}
              />
            </div>
          </div>

          {/* Cents Offset Tuning Needle */}
          <div className="w-full">
            <div className="flex items-center justify-between w-full text-[9px] text-slate-400 font-mono mb-1">
              <span>-50ct (Bas)</span>
              <span className={Math.abs(cents) <= 10 && isPitched ? 'text-emerald-400 font-bold' : ''}>
                {isPitched ? `${cents > 0 ? '+' : ''}${cents} cents` : 'Accord'}
              </span>
              <span>+50ct (Haut)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full relative overflow-hidden flex items-center">
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-500 z-10" />
              {isPitched && (
                <div
                  className={`absolute top-0 bottom-0 w-3 rounded-full transition-all duration-75 ${
                    Math.abs(cents) < 15 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{
                    left: `calc(50% + ${(cents / 50) * 45}% - 6px)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Target Reminder */}
        <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <span className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-0.5">
            Note cible à jouer sur votre piano
          </span>
          <span className="text-3xl font-black text-amber-400 tracking-tight">
            {targetPitch}
          </span>
        </div>
      </div>

      {/* Diagnostics / Troubleshooting Panel with Readable Last 2 States History */}
      {showDebug && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5" />
              <span>Réglages Sensibilité Microphone</span>
            </span>

            {/* Presets */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => handleSensitivity('high')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  sensitivityPreset === 'high'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Haute (Piano feutré / doux)
              </button>
              <button
                onClick={() => handleSensitivity('normal')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  sensitivityPreset === 'normal'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Normale
              </button>
              <button
                onClick={() => handleSensitivity('low')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  sensitivityPreset === 'low'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Basse (Pièce bruyante)
              </button>
            </div>
          </div>

          {/* Real-time metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono mb-2">
            <div>
              <span className="text-slate-500 block">État Audio :</span>
              <span
                className={`font-bold ${
                  audioState === 'running'
                    ? 'text-emerald-400'
                    : audioState === 'suspended'
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              >
                {audioState}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Volume RMS brut :</span>
              <span className="text-slate-300 font-bold">{rawRms.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Échantillonnage :</span>
              <span className="text-slate-300 font-bold">
                {currentPitch?.sampleRate ? `${currentPitch.sampleRate} Hz` : '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Confiance :</span>
              <span className="text-slate-300 font-bold">
                {currentPitch ? `${Math.round(currentPitch.confidence * 100)}%` : '---'}
              </span>
            </div>
          </div>

          {/* Last 2 States of the DSP Log (Readable & Frozen between transitions) */}
          <div className="bg-slate-950/90 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5 font-semibold">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Historique des 2 dernières détections :</span>
            </div>

            {dspHistory.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">En attente des premières notes du piano...</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {dspHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg border text-[11px] font-mono ${
                      idx === 0
                        ? 'bg-slate-900 border-slate-700 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">{item.time}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          item.isPitched
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx === 0 ? 'Dernier signal' : 'Signal précédent'}
                      </span>
                      <strong className={item.isPitched ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                        {item.note}
                      </strong>
                      {item.isPitched && <span className="text-slate-400 text-[10px]">({item.frequency})</span>}
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span>Confiance : {item.confidence}%</span>
                      <span className="text-slate-500">|</span>
                      <span>RMS : {item.rms.toFixed(4)}</span>
                      <span className="text-slate-500 truncate max-w-[150px]">({item.message})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
