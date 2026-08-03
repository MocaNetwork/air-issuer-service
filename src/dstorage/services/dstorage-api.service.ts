import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import { MOCA_CHAIN_API } from '../../common/api-origin-dictionary';
import {
  CreateObjectRequestBody,
  CreateObjectRequestHeader,
  CreateObjectResponseBody,
} from '../interfaces/create-object-request.interface';

@Injectable()
export class DStorageAPIService {
  private readonly axiosRef: AxiosInstance = this.httpService.axiosRef;
  private readonly nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'sandbox';
  private readonly origin: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.origin =
      this.configService.get<string>('MOCA_CHAIN_API_ORIGIN')! ??
      MOCA_CHAIN_API[this.nodeEnv] ??
      MOCA_CHAIN_API.sandbox;
  }

  async createObject(data: CreateObjectRequestBody, headers: CreateObjectRequestHeader) {
    const url = `${this.origin}/v1/dstorage/vcs`;
    const response = await this.axiosRef.post<CreateObjectResponseBody>(url, data, {
      headers: { ...headers },
    });

    return {
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  }
}
