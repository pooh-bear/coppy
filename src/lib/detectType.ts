export type ClipType = 'text' | 'md' | 'code' | 'json' | 'link';

const URL_LINE = /^https?:\/\/\S+$/i;
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|yml|yaml|toml|sh|bash|zsh|py|rb|go|rs|c|cpp|h|hpp|java|kt|swift|css|scss|less|html|xml|sql|graphql|proto|config|ini|cfg|env|dockerfile)$/i;

/** First line of content, if it's a bare URL. */
export function leadingUrl(content: string): string | null {
  const first = content.trim().split('\n')[0].trim();
  return URL_LINE.test(first) ? first : null;
}

function looksLikeMarkdown(content: string): boolean {
  const signals = [
    /^#{1,6}\s+\S/m,
    /^\s*[-*] \[[ xX]\]\s/m,
    /\*\*\S[^*\n]*\*\*/,
    /^```/m,
    /\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/,
  ];
  if (signals.some((p) => p.test(content))) return true;
  return (content.match(/^\s*[-*]\s+\S/gm) || []).length >= 2;
}

function looksLikeCode(content: string): boolean {
  const patterns = [
    /^(import|export|const|let|var|function|class|interface|type|enum|def|pub|fn|use|mod|package|#include)\b/m,
    /=>\s*[{(]/,
    /^\s*\/\/\s/m,
    /\/\*[\s\S]*?\*\//,
    /<[a-z]+[\s>][^>]*>/i,
    /['"]use strict['"]/,
    /^#!\//m,
    /^\$\s/m,
    /^[\w.-]+:\s*\n\s{2,}\S/m, // YAML-ish nesting
    /[{}]\s*$/m,
  ];
  return patterns.some((p) => p.test(content));
}

/**
 * Detect a clip's type from its title (file extension wins) and content.
 */
export function detectClipType(title: string, content: string): ClipType {
  const trimmed = content.trim();

  if (leadingUrl(trimmed)) return 'link';

  if (/^[[{]/.test(trimmed) && /[\]}]$/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not JSON
    }
  }

  if (/\.json$/i.test(title)) return 'json';
  if (/\.(md|markdown|mdx)$/i.test(title)) return 'md';
  if (/\.txt$/i.test(title)) return 'text';
  if (CODE_EXT.test(title)) return 'code';

  if (looksLikeMarkdown(trimmed)) return 'md';
  if (looksLikeCode(trimmed)) return 'code';
  return 'text';
}
