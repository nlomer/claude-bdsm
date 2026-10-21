// Service: playful local lexical heuristic, never a psychological or policy-risk assessment.
export function rage(text: string): number {
  const attacks = (text.match(/\b(?:idiot|moron|useless|worthless|stupid)\b/gi) ?? []).length;
  const profanity = (text.match(/\b(?:fuck\w*|shit|damn)\b/gi) ?? []).length;
  const emphasis = (text.match(/!|\b[A-Z]{3,}\b/g) ?? []).length;
  return Math.min(100, attacks * 25 + profanity * 15 + emphasis * 5);
}
