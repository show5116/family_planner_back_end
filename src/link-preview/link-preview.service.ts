import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import { RedisService } from '@/redis/redis.service';
import { LinkPreviewDto } from './dto/link-preview-response.dto';

const CACHE_TTL = 24 * 60 * 60; // 24시간
const FETCH_TIMEOUT_MS = 5000;
const USER_AGENT = 'Mozilla/5.0 (compatible; FamilyPlannerBot/1.0)';

// SSRF 방어: 내부 네트워크 IP 패턴
const BLOCKED_HOSTS =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  constructor(private readonly redis: RedisService) {}

  async getPreview(rawUrl: string): Promise<LinkPreviewDto> {
    const url = this.validateUrl(rawUrl);
    const cacheKey = `link-preview:${url}`;

    const cached = await this.redis.get<LinkPreviewDto>(cacheKey);
    if (cached) return cached;

    const result = await this.fetchPreview(url);
    await this.redis.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  private validateUrl(rawUrl: string): string {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('유효하지 않은 URL입니다.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('http 또는 https URL만 허용됩니다.');
    }

    const hostname = parsed.hostname;
    if (BLOCKED_HOSTS.test(hostname)) {
      throw new ForbiddenException('내부 네트워크 주소는 허용되지 않습니다.');
    }

    return parsed.toString();
  }

  private async fetchPreview(url: string): Promise<LinkPreviewDto> {
    const empty: LinkPreviewDto = {
      url,
      title: null,
      description: null,
      image: null,
      siteName: null,
    };

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) return empty;

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) return empty;

      const html = await response.text();
      return this.parseOgTags(url, html);
    } catch (err) {
      this.logger.warn(
        `링크 프리뷰 fetch 실패: ${url} — ${(err as Error).message}`,
      );
      return empty;
    }
  }

  private parseOgTags(url: string, html: string): LinkPreviewDto {
    const $ = cheerio.load(html);
    const base = new URL(url);

    const meta = (property: string) =>
      $(`meta[property="${property}"]`).attr('content') ||
      $(`meta[name="${property}"]`).attr('content') ||
      null;

    const title =
      meta('og:title') ||
      meta('twitter:title') ||
      $('title').text().trim() ||
      null;

    const description =
      meta('og:description') ||
      meta('twitter:description') ||
      meta('description') ||
      null;

    const rawImage = meta('og:image') || meta('twitter:image') || null;
    const image = rawImage ? this.toAbsoluteUrl(base, rawImage) : null;

    const siteName =
      meta('og:site_name') || base.hostname.replace(/^www\./, '');

    return { url, title, description, image, siteName };
  }

  private toAbsoluteUrl(base: URL, src: string): string {
    try {
      return new URL(src, base).toString();
    } catch {
      return src;
    }
  }
}
