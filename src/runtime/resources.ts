// Adapter: sample OS-labelled child memory and wrapper RSS; no prompt data is observed.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { stopChild } from './process.js';
export function sampleResources(pid: number, enabled = true) {
  const samples: { at: number; childBytes: number; privateBytes?: number; wrapperRss: number }[] = [];
  let pending = '';
  const child = enabled && process.platform === 'win32' ? spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `$ErrorActionPreference='Stop'; while ($true) { $p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if (!$p) { break }; Write-Output (\"{0},{1}\" -f $p.WorkingSet64,$p.PrivateMemorySize64); Start-Sleep -Milliseconds 250 }`],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }) : undefined;
  const add = (childBytes: number, privateBytes?: number) => samples.push({ at: Date.now(), childBytes,
    ...(privateBytes !== undefined ? { privateBytes } : {}), wrapperRss: process.memoryUsage().rss });
  child?.stdout.on('data', (chunk: Buffer) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/); pending = lines.pop()!;
    for (const line of lines) { const [working, privateSize] = line.split(',').map(Number); if (working) add(working, privateSize); }
  });
  const timer = enabled && process.platform === 'linux' ? setInterval(() => {
    void readFile(`/proc/${pid}/status`, 'utf8').then(text => add(Number(/VmRSS:\s+(\d+)/.exec(text)?.[1] ?? 0) * 1024)).catch(() => {});
  }, 250) : undefined;
  return {
    summary: () => ({ metric: process.platform === 'win32' ? 'Windows working set/private bytes' : 'Linux RSS',
      intervalMs: 250, samples: samples.length,
      residentBudgetDefinition: 'Inference child + Node wrapper; Windows measurement-helper memory excluded. Shared pages can be double-counted.',
      measurementEnabled: enabled,
      childPeakBytes: samples.length ? Math.max(...samples.map(s => s.childBytes)) : null,
      childPrivatePeakBytes: process.platform === 'win32' && samples.length ? Math.max(...samples.map(s => s.privateBytes ?? 0)) : null,
      wrapperPeakRssBytes: Math.max(process.memoryUsage().rss, ...samples.map(s => s.wrapperRss)),
      sampledTreePeakBytes: samples.length ? Math.max(...samples.map(s => s.childBytes + s.wrapperRss)) : null,
      limitations: 'Sampled peaks can miss spikes; sampler starts asynchronously; mmap/page cache is OS dependent. No OS cache clearing.' }),
    close: async () => { if (timer) clearInterval(timer); if (child) await stopChild(child); }
  };
}
