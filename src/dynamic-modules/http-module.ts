import { HttpModule as HttpModuleBase } from '@nestjs/axios';
import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createSocksProxyAgent } from '../shims/socks-proxy-agent';

export const HttpModule: DynamicModule = HttpModuleBase.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const socks5Proxy = configService.get<string>('SOCKS5_PROXY');
    const agent = socks5Proxy ? createSocksProxyAgent(socks5Proxy) : undefined;

    return {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10_000,
    };
  },
  global: true,
});
