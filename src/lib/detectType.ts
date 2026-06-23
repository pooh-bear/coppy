export type ClipType = 'code' | 'json' | 'text' | 'link';

/**
 * Detect the type of clipboard content based on its content.
 */
export function detectClipType(content: string): ClipType {
  const trimmed = content.trim();

  // Check if it's a JSON object or array
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON, fall through
    }
  }

  // Check if it's a code-like content (contains common code patterns)
  const codePatterns = [
    /^(import|export|const|let|var|function|class|interface|type|enum|if|for|while|switch|try|catch|def|pub|fn|use|mod)/m,
    /=>\s*{/,
    /\/\/.*$/m,
    /\/\*[\s\S]*?\*\//,
    /<[a-z]+[\s>][^>]*>/i,
    /['"]use strict['"]/,
    /^#!\/usr\/bin\//m,
    /^\$\s/m,
  ];

  // Check if it's a URL
  const urlPattern = /^https?:\/\/[^\s]+$/i;

  if (urlPattern.test(trimmed)) {
    return 'link';
  }

  if (codePatterns.some(p => p.test(content))) {
    return 'code';
  }

  return 'text';
}

/**
 * Detect type from title as fallback (e.g., "docker-compose.yml" -> "code").
 */
export function detectTypeFromTitle(title: string, content: string): ClipType {
  const contentType = detectClipType(content);
  if (contentType !== 'text') return contentType;

  const codeExtensions = /\.(ts|tsx|js|jsx|json|yml|yaml|toml|sh|bash|zsh|py|rb|go|rs|c|cpp|h|hpp|java|kt|swift|css|scss|less|html|xml|sql|graphql|proto|md|txt|config|ini|cfg)$/i;
  if (codeExtensions.test(title)) return 'code';

  return 'text';
}
