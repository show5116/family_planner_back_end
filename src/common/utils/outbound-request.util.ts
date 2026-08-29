/**
 * 외부 API 호출 실패 시 "실제로 나간 요청"을 진단용으로 요약한다.
 *
 * 응답만 로깅하면 요청이 어떻게 조립돼 나갔는지 알 수 없어, 파라미터 누락/인코딩 깨짐/
 * 키 미주입 같은 원인을 구분할 수 없다. axios 에러의 `config`에는 전송된 요청이 그대로
 * 남아 있으므로 이를 마스킹해서 남긴다.
 */

/** 값의 실체를 노출하지 않으면서 정상 주입 여부만 판별할 수 있게 요약 */
function describeSecret(value: unknown): string {
  if (value === undefined) return 'MISSING';
  if (value === null) return 'NULL';
  const str = String(value);
  if (str.length === 0) return 'EMPTY';
  return `len=${str.length},head=${str.slice(0, 4)}`;
}

/** 쿼리 파라미터에서 비밀값으로 취급할 키 (부분 일치, 대소문자 무시) */
const SECRET_PARAM_PATTERN = /key|token|secret|password|credential/i;

/**
 * axios 에러에서 전송된 요청을 마스킹된 한 줄로 요약한다.
 *
 * serviceKey 등 비밀 파라미터는 값 대신 길이/앞 4자만 남겨, 로그로 유출되지 않으면서도
 * "주입은 됐는지 / 길이가 맞는지"를 판별할 수 있게 한다.
 */
export function describeOutboundRequest(error: unknown): string {
  const config = (error as { config?: Record<string, unknown> })?.config;
  if (!config) return 'no-request-config';

  const method = String(config.method ?? 'get').toUpperCase();
  const url = String(config.url ?? 'unknown');

  const params = config.params;
  if (!params || typeof params !== 'object') {
    return `${method} ${url} (params 없음)`;
  }

  const described = Object.entries(params as Record<string, unknown>)
    .map(([key, value]) => {
      const shown = SECRET_PARAM_PATTERN.test(key)
        ? describeSecret(value)
        : `${String(value)}(${typeof value})`;
      return `${key}=${shown}`;
    })
    .join(' ');

  return `${method} ${url} :: ${described}`;
}
