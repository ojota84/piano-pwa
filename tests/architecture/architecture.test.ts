import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Ports & Adapters Architectural Boundary Tests', () => {
  const rootDir = path.resolve(__dirname, '../../src');
  const coreDir = path.join(rootDir, 'core');
  const infraDir = path.join(rootDir, 'infrastructure');
  const presentationDir = path.join(rootDir, 'presentation');

  function getFilesRecursively(dir: string, extension: string = '.ts'): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...getFilesRecursively(fullPath, extension));
      } else if (file.endsWith(extension) || file.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('Rule 1: Core Domain MUST NOT import React, DOM, or UI libraries', () => {
    const coreFiles = getFilesRecursively(coreDir);
    expect(coreFiles.length).toBeGreaterThan(0);

    const forbiddenImports = ['react', 'react-dom', 'lucide-react', 'canvas-confetti', '@vitejs'];

    for (const filePath of coreFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
          for (const forbidden of forbiddenImports) {
            expect(
              line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`),
              `Core file ${path.relative(rootDir, filePath)} violates architecture by importing '${forbidden}' on line: ${line}`
            ).toBe(false);
          }
        }
      }
    }
  });

  it('Rule 2: Core Domain MUST NOT import Infrastructure or Presentation layers (Inward dependency rule)', () => {
    const coreFiles = getFilesRecursively(coreDir);

    for (const filePath of coreFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
          expect(
            line.includes('infrastructure') || line.includes('presentation'),
            `Core file ${path.relative(rootDir, filePath)} violates Hexagonal rule: inward dependencies only. Found import: ${line}`
          ).toBe(false);
        }
      }
    }
  });

  it('Rule 3: Core Domain MUST NOT reference Web Audio or browser globals (Zero platform coupling)', () => {
    const coreFiles = getFilesRecursively(coreDir);
    const browserAudioGlobals = ['AudioContext', 'webkitAudioContext', 'navigator.mediaDevices', 'window.'];

    for (const filePath of coreFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const globalName of browserAudioGlobals) {
        expect(
          content.includes(globalName),
          `Core file ${path.relative(rootDir, filePath)} contains direct browser/audio global '${globalName}'. Keep domain pure!`
        ).toBe(false);
      }
    }
  });

  it('Rule 4: Infrastructure adapters MUST implement their corresponding Core Ports', () => {
    const pitchAdapterFile = path.join(infraDir, 'audio/WebAudioPitchAdapter.ts');
    const repoFile = path.join(infraDir, 'data/InMemoryPartitionRepository.ts');

    expect(fs.existsSync(pitchAdapterFile)).toBe(true);
    expect(fs.existsSync(repoFile)).toBe(true);

    const pitchContent = fs.readFileSync(pitchAdapterFile, 'utf-8');
    expect(pitchContent).toContain('implements AudioPitchPort');

    const repoContent = fs.readFileSync(repoFile, 'utf-8');
    expect(repoContent).toContain('implements PartitionRepositoryPort');
  });

  it('Rule 5: Presentation layer components MUST NOT contain raw pitch DSP autocorrelation algorithms', () => {
    const presComponents = getFilesRecursively(presentationDir);

    for (const filePath of presComponents) {
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(
        content.includes('parabolic') || content.includes('bestCorrelation'),
        `Presentation file ${path.relative(rootDir, filePath)} contains DSP pitch algorithm! Audio DSP must live in Infrastructure adapters.`
      ).toBe(false);
    }
  });
});
