// Adapter: read host capabilities without networking, downloads, or inference.
import { availableParallelism, arch, platform, totalmem } from 'node:os';

export function doctor() {
  const supported = /^v22\./.test(process.version) && Number(process.versions.node.split('.')[1]) >= 16;
  return {
    node: process.version, nodeSupported: supported, platform: platform(), arch: arch(),
    logicalCpus: availableParallelism(), defaultThreads: Math.min(4, availableParallelism()),
    ramBytes: totalmem(),
    phase: 'foundation', runtime: 'not_configured', models: 'not_configured',
    inferenceReady: false, networkUsed: false,
    diagnostics: ['RUNTIME_NOT_CONFIGURED', 'MODELS_NOT_CONFIGURED']
  };
}
