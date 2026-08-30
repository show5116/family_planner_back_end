import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { describeOutboundRequest } from '@/common/utils/outbound-request.util';

const API_URL =
  'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo';

/**
 * [임시] 공휴일 API가 앱에서만 400으로 실패하는 원인을 좁히기 위한 진단 서비스.
 *
 * 수동 probe(별도 프로세스)는 200인데 앱 프로세스만 400이 나는 모순을 재현하기 위해,
 * 앱과 동일한 프로세스 안에서 호출 방식만 바꿔가며 비교한다.
 * 원인 확정 후 이 파일과 컨트롤러 엔드포인트를 제거한다.
 */
@Injectable()
export class HolidayDiagnosticService {
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceKey = this.configService.get<string>('weather.kmaServiceKey');
  }

  private buildParams() {
    return {
      serviceKey: this.serviceKey,
      pageNo: 1,
      numOfRows: 50,
      solYear: 2027,
      solMonth: '07',
      _type: 'json',
    };
  }

  private queryString(): string {
    const entries = Object.entries(this.buildParams()).map(([k, v]) => [
      k,
      String(v),
    ]);
    return new URLSearchParams(entries).toString();
  }

  private async attempt(label: string, run: () => Promise<unknown>) {
    try {
      return { label, ok: true, value: await run() };
    } catch (error) {
      return {
        label,
        ok: false,
        status: error?.response?.status,
        body: error?.response?.data,
        request: describeOutboundRequest(error),
        message: error?.message,
      };
    }
  }

  async run(): Promise<Record<string, unknown>> {
    // A: 앱이 실제로 쓰는 경로 (HttpService + params 객체)
    const a = await this.attempt('A:httpService+params', async () => {
      const { data } = await firstValueFrom(
        this.httpService.get(API_URL, { params: this.buildParams() }),
      );
      return data?.response?.header ?? data;
    });

    // B: 같은 HttpService, 쿼리스트링 직접 조립 (params 직렬화 요인 배제)
    const b = await this.attempt('B:httpService+rawQuery', async () => {
      const { data } = await firstValueFrom(
        this.httpService.get(API_URL + '?' + this.queryString()),
      );
      return data?.response?.header ?? data;
    });

    // C: HttpService를 거치지 않는 순수 node http (수동 probe와 동일 조건)
    const c = await this.attempt('C:nodeHttp', async () => {
      const http = await import('http');
      const url = API_URL + '?' + this.queryString();
      return new Promise((resolve, reject) => {
        http
          .get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () =>
              resolve({ statusCode: res.statusCode, body: body.slice(0, 200) }),
            );
          })
          .on('error', reject);
      });
    });

    return {
      keyLength: this.serviceKey?.length ?? 0,
      keyHead: this.serviceKey?.slice(0, 4) ?? null,
      results: [a, b, c],
    };
  }
}
