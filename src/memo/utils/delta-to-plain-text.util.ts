/**
 * Quill Delta JSON 문자열에서 순수 텍스트만 추출한다.
 * Delta가 아닌 포맷(MARKDOWN, HTML, PLAIN)은 content를 그대로 반환한다.
 */
export function deltaToPlainText(content: string): string {
  if (!content?.trim()) return '';

  try {
    const delta = JSON.parse(content);
    if (!Array.isArray(delta?.ops)) return content;

    return delta.ops
      .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
      .join('')
      .trim();
  } catch {
    return content;
  }
}
