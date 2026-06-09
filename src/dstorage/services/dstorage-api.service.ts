import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosInstance } from 'axios';
import {
  CreateObjectRequestBody,
  CreateObjectRequestHeader,
  CreateObjectResponseBody,
} from '../interfaces/create-object-request.interface';

@Injectable()
export class DStorageAPIService {
  private readonly axiosRef: AxiosInstance = this.httpService.axiosRef;
  private readonly mocaChainApiOrigin = this.configService.getOrThrow<string>('MOCA_CHAIN_API_ORIGIN');

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createObject(data: CreateObjectRequestBody, headers: CreateObjectRequestHeader) {
    const url = `${this.mocaChainApiOrigin}/v1/dstorage/objects`;
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
