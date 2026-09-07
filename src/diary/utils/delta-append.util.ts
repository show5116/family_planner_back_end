/**
 * 빠른 기록 조각을 Quill Delta 문서 끝에 append 하는 유틸
 *
 * 조각은 별도 테이블이 아니라 그날 일기 Delta 안의 블록으로 누적된다.
 * 시각 마커(capturedAt)는 attributes.diaryTime으로 붙여, 프론트가 좌측에
 * 렌더링하고 다듬기 모드에서 일괄 제거할 수 있게 한다.
 */

interface DeltaOp {
  insert?: unknown;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Delta {
  ops: DeltaOp[];
}

/** 빈 Delta 문서 */
export function emptyDelta(): Delta {
  return { ops: [] };
}

/** Delta JSON 문자열을 파싱한다. 파싱 불가하면 기존 내용을 평문 블록으로 감싼다 */
function parseDelta(content?: string | null): Delta {
  if (!content?.trim()) return emptyDelta();

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.ops)) return { ops: parsed.ops as DeltaOp[] };
  } catch {
    // Delta가 아닌 포맷(PLAIN/MARKDOWN)은 평문 블록으로 취급
  }

  return { ops: [{ insert: ensureTrailingNewline(content) }] };
}

/** 블록 경계를 보장하기 위해 문단 끝 개행을 붙인다 */
function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

/**
 * Delta 문서 끝에 텍스트 조각을 문단 단위로 추가한 JSON 문자열을 반환한다.
 * capturedAt('HH:mm')이 있으면 해당 문단에 diaryTime attribute를 부여한다.
 */
export function appendTextToDelta(
  content: string | null | undefined,
  text: string,
  capturedAt?: string,
): string {
  const delta = parseDelta(content);

  const op: DeltaOp = { insert: ensureTrailingNewline(text.trim()) };
  if (capturedAt) {
    op.attributes = { diaryTime: capturedAt };
  }

  delta.ops.push(op);

  return JSON.stringify(delta);
}
