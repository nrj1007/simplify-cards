export function withoutSentenceEndingFullStop(value: string) {
  return value.replace(/\.(?=\s*$)/u, "");
}

