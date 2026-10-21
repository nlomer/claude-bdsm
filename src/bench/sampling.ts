// Constants: exact development-card variant settings, separate from the primary greedy baseline.
export function cardSampling(model: string) {
  return { temperature: model.startsWith('smol') ? .2 : model.startsWith('qwen35') ? 1 : .7,
    topP: model.startsWith('smol') ? .9 : model.startsWith('qwen35') ? 1 : .8,
    topK: model.startsWith('smol') ? 40 : 20, presencePenalty: model.startsWith('qwen35') ? 2 : 0 };
}
