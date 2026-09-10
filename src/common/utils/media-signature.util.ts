/**
 * 파일 앞부분 매직바이트로 실제 형식을 판별한다.
 *
 * presigned 업로드에서는 Content-Type이 서명 대상이 아니라(SignedHeaders=host)
 * 클라이언트가 아무 값이나 붙이거나 생략할 수 있고, R2는 그 값을 그대로 저장한다.
 * 즉 신고값·저장된 헤더 어느 쪽도 내용을 보증하지 못하므로, 바이트를 직접 봐야
 * 화이트리스트가 실제 보증이 된다.
 */

/** 판별에 필요한 최소 바이트 수 (ISO-BMFF의 major/compatible brand까지 커버) */
export const MAGIC_BYTES_LENGTH = 32;

/** ISO-BMFF 컨테이너 브랜드 → MIME */
const ISO_BRANDS: Record<string, string> = {
  qt: 'video/quicktime',
  isom: 'video/mp4',
  iso2: 'video/mp4',
  iso4: 'video/mp4',
  iso5: 'video/mp4',
  iso6: 'video/mp4',
  mp41: 'video/mp4',
  mp42: 'video/mp4',
  avc1: 'video/mp4',
  dash: 'video/mp4',
  mmp4: 'video/mp4',
  m4v: 'video/mp4',
  // HEIC/HEIF도 같은 컨테이너다 — 브랜드로 갈라야 image/jpeg로 신고한 HEIC를 잡는다
  heic: 'image/heic',
  heix: 'image/heic',
  hevc: 'image/heic',
  hevx: 'image/heic',
  heim: 'image/heic',
  heis: 'image/heic',
  mif1: 'image/heif',
  msf1: 'image/heif',
};

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function ascii(buffer: Buffer, start: number, end: number): string {
  if (buffer.length < end) return '';
  return buffer.subarray(start, end).toString('latin1');
}

/**
 * 앞부분 바이트로 MIME을 판별한다. 아는 형식이 아니면 null.
 *
 * @param head - 파일 선두 바이트 (MAGIC_BYTES_LENGTH 만큼)
 */
export function detectMimeType(head: Buffer): string | null {
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  if (ascii(head, 0, 5) === '%PDF-') return 'application/pdf';

  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  const gif = ascii(head, 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';

  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (ascii(head, 4, 8) === 'ftyp') {
    // major brand(8~12) 우선, 없으면 compatible brand(16~) 순으로 본다
    const brands = [ascii(head, 8, 12)];
    for (let offset = 16; offset + 4 <= head.length; offset += 4) {
      brands.push(ascii(head, offset, offset + 4));
    }

    for (const brand of brands) {
      const normalized = brand.trim().toLowerCase();
      if (ISO_BRANDS[normalized]) return ISO_BRANDS[normalized];
    }

    return 'application/octet-stream';
  }

  return null;
}
