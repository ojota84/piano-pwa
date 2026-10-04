import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Ports & Adapters Architectural Boundary Tests', () => {
  const rootDir = path.resolve(import.meta.dirname, '../../src');
  const coreDir = path.join(rootDir, 'core');
  const infraDir = path.join(rootDir, 'infrastructure');
  const presentationDir = path.join(rootDir, 'presentation');

  function getFilesRecursively(dir: string, extension: string = '.ts'): readonly string[] {
    if (!fs.existsSync(dir)) return Object.freeze([]);

    const entries = fs.readdirSync(dir);
    return Object.freeze(
      entries.flatMap((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          return getFilesRecursively(fullPath, extension);
        }
        return file.endsWith(extension) || file.endsWith('.tsx') ? [fullPath] : [];
      })
    );
  }

  it('Rule 1: Core Domain MUST NOT import React, DOM, or UI libraries', () => {
    const coreFiles = getFilesRecursively(coreDir);
    expect(coreFiles.length).toBeGreaterThan(0);

    const forbiddenImports = Object.freeze([
      'react',
      'react-dom',
      'lucide-react',
      'canvas-confetti',
      '@vitejs',
    ]);

    coreFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const importLines = content
        .split('\n')
        .filter((line) => line.trim().startsWith('import ') || line.trim().startsWith('export '));

      importLines.forEach((line) => {
        forbiddenImports.forEach((forbidden) => {
          expect(
            line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`),
            `Core file ${path.relative(rootDir, filePath)} violates architecture by importing '${forbidden}' on line: ${line}`
          ).toBe(false);
        });
      });
    });
  });

  it('Rule 2: Core Domain MUST NOT import Infrastructure or Presentation layers (Inward dependency rule)', () => {
    const coreFiles = getFilesRecursively(coreDir);

    coreFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const importLines = content
        .split('\n')
        .filter((line) => line.trim().startsWith('import ') || line.trim().startsWith('export '));

      importLines.forEach((line) => {
        expect(
          line.includes('infrastructure') || line.includes('presentation'),
          `Core file ${path.relative(rootDir, filePath)} violates Hexagonal rule: inward dependencies only. Found import: ${line}`
        ).toBe(false);
      });
    });
  });

  it('Rule 3: Core Domain MUST NOT reference Web Audio or browser globals (Zero platform coupling)', () => {
    const coreFiles = getFilesRecursively(coreDir);
    const browserAudioGlobals = Object.freeze([
      'AudioContext',
      'webkitAudioContext',
      'navigator.mediaDevices',
      'window.',
    ]);

    coreFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      browserAudioGlobals.forEach((globalName) => {
        expect(
          content.includes(globalName),
          `Core file ${path.relative(rootDir, filePath)} contains direct browser/audio global '${globalName}'. Keep domain pure!`
        ).toBe(false);
      });
    });
  });

  it('Rule 4: Infrastructure adapters MUST implement their corresponding Core Ports and delegate DSP to Core', () => {
    const pitchAdapterFile = path.join(infraDir, 'audio/WebAudioPitchAdapter.ts');
    const repoFile = path.join(infraDir, 'data/InMemoryPartitionRepository.ts');
    const progressFile = path.join(infraDir, 'storage/ProgressStorage.ts');
    const coreDspFile = path.join(coreDir, 'dsp/pitchDetector.ts');

    expect(fs.existsSync(pitchAdapterFile)).toBe(true);
    expect(fs.existsSync(repoFile)).toBe(true);
    expect(fs.existsSync(progressFile)).toBe(true);
    expect(fs.existsSync(coreDspFile)).toBe(true);

    const pitchContent = fs.readFileSync(pitchAdapterFile, 'utf-8');
    expect(pitchContent).toContain('implements AudioPitchPort');
    expect(pitchContent).toContain('detectPitchFromBuffer');

    const repoContent = fs.readFileSync(repoFile, 'utf-8');
    expect(repoContent).toContain('implements PartitionRepositoryPort');

    const progressContent = fs.readFileSync(progressFile, 'utf-8');
    expect(progressContent).toContain('implements ProgressRepositoryPort');
  });

  it('Rule 5: Presentation layer components MUST NOT contain raw pitch DSP or import storage adapters directly', () => {
    const presComponents = getFilesRecursively(path.join(presentationDir, 'components'));

    presComponents.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(
        content.includes('parabolic') || content.includes('bestCorrelation'),
        `Presentation file ${path.relative(rootDir, filePath)} contains DSP pitch algorithm!`
      ).toBe(false);
      expect(
        content.includes('infrastructure/storage'),
        `Presentation component ${path.relative(rootDir, filePath)} imports infrastructure/storage directly instead of receiving ProgressRepositoryPort data via props!`
      ).toBe(false);
    });
  });
});
