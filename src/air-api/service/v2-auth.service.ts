import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import { AIR_API } from '../../common/api-origin-dictionary';
import { InitializeUserRequestBody, InitializeUserResponseBody } from '../interfaces/initialize-user-request.interface';

@Injectable()
export class V2AuthService {
  private readonly axiosRef: AxiosInstance = this.httpService.axiosRef;
  private readonly nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'sandbox';
  private readonly partnerId = this.configService.getOrThrow<string>('PARTNER_ID');
  private readonly origin: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.origin = this.configService.get<string>('AIR_API_ORIGIN') ?? AIR_API[this.nodeEnv] ?? AIR_API.sandbox;
  }

  async initializeUser(data: InitializeUserRequestBody) {
    const url = `${this.origin}/v2/auth/initialize-user`;
    const response = await this.axiosRef.post<InitializeUserResponseBody>(url, data, {
      headers: { 'x-partner-id': this.partnerId },
    });

    return {
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  }
}
