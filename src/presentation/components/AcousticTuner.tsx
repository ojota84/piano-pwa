import React, { useState, useEffect, useRef } from 'react';
import { PitchResult } from '../../core/models/pitch.types.ts';
import { Mic, Sliders, AlertTriangle } from 'lucide-react';

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
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [sensitivityPreset, setSensitivityPreset] = useState<'high' | 'normal' | 'low'>('normal');
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
      const timeStr =
        now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);

      const record: DspStateRecord = {
        id: Math.random().toString(),
        time: timeStr,
        note: currentPitch.isPitched
          ? `${currentPitch.solfegeName} ${currentPitch.octave}`
          : 'Silence',
        frequency: currentPitch.isPitched ? `${currentPitch.frequency.toFixed(1)} Hz` : '0 Hz',
        confidence: Math.round(currentPitch.confidence * 100),
        rms: currentPitch.rms,
        isPitched: currentPitch.isPitched,
      };

      setDspHistory((prev) => [record, ...prev.slice(0, 1)]);
    }
  }, [currentPitch]);

  const isPitched = currentPitch?.isPitched ?? false;
  const solfege = isPitched ? `${currentPitch!.solfegeName} ${currentPitch!.octave}` : '—';
  const frequency = isPitched ? `${currentPitch!.frequency.toFixed(0)} Hz` : '';
  const isMatch = isPitched && solfege === targetPitch;

  const rawRms = currentPitch?.rms ?? 0;
  const volumePercent = Math.min(100, Math.round(rawRms * 1600));
  const audioState = currentPitch?.audioState ?? (isListening ? 'running' : 'inactive');

  const handleSensitivity = (preset: 'high' | 'normal' | 'low') => {
    setSensitivityPreset(preset);
    if (preset === 'high') {
      onSetSensitivity(0.0006);
      onSetGain(4.5);
    } else if (preset === 'normal') {
      onSetSensitivity(0.0018);
      onSetGain(3.0);
    } else {
      onSetSensitivity(0.0040);
      onSetGain(1.8);
    }
  };

  return (
    <div className="w-full text-slate-200">
      {/* Minimalist Flat Pitch & Microphone Strip */}
      <div className="py-4 border-b border-slate-900 flex flex-wrap items-center justify-between gap-6">
        {/* Left: Target Note & Heard Note side by side */}
        <div className="flex items-center gap-8">
          <div>
            <span className="block text-[11px] text-slate-500">À jouer</span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
              {targetPitch}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-900" />

          <div>
            <span className="block text-[11px] text-slate-500">Entendu</span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-bold tracking-tight transition-colors ${
                  isMatch
                    ? 'text-emerald-400'
                    : isPitched
                    ? 'text-slate-100'
                    : 'text-slate-600'
                }`}
              >
                {solfege}
              </span>
              {frequency && (
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {frequency}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Minimal Volume Bar & Mic Controls */}
        <div className="flex items-center gap-4">
          {/* Thin minimalist level bar */}
          <div className="w-20 h-1 bg-slate-900 overflow-hidden" title="Niveau sonore">
            <div
              className={`h-full transition-all duration-75 ${
                volumePercent > 15 ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
              style={{ width: `${volumePercent}%` }}
            />
          </div>

          {isListening && audioState === 'suspended' && (
            <button
              onClick={onResumeAudio}
              className="flex items-center gap-1.5 text-amber-400 text-xs hover:underline cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Réactiver l'audio</span>
            </button>
          )}

          <button
            onClick={onToggleListening}
            className={`flex items-center gap-2 text-xs font-medium py-1.5 px-3 transition-colors cursor-pointer ${
              isListening
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isListening ? 'Micro actif' : 'Activer le micro'}</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 transition-colors cursor-pointer ${
              showSettings ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Sensibilité du micro"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Minimalist Sensitivity & History Panel */}
      {showSettings && (
        <div className="py-3 border-b border-slate-900 text-xs text-slate-400 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Sensibilité du microphone :</span>
            <div className="flex items-center gap-4">
              {(['high', 'normal', 'low'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSensitivity(preset)}
                  className={`cursor-pointer transition-colors ${
                    sensitivityPreset === preset
                      ? 'text-amber-400 font-semibold underline underline-offset-4'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {preset === 'high' && 'Haute (piano doux)'}
                  {preset === 'normal' && 'Normale'}
                  {preset === 'low' && 'Basse (pièce bruyante)'}
                </button>
              ))}
            </div>
          </div>

          {dspHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
              {dspHistory.map((item, idx) => (
                <span key={item.id}>
                  {idx === 0 ? 'Dernier :' : 'Précédent :'} {item.note} ({item.frequency},{' '}
                  {item.confidence}%)
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
