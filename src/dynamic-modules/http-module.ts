import { HttpModule as HttpModuleBase } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const HttpModule = HttpModuleBase.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    let agent: SocksProxyAgent | undefined = undefined;

    const socks5Proxy = configService.get<string>('SOCKS5_PROXY');
    if (socks5Proxy) agent = new SocksProxyAgent(socks5Proxy);

    return {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10_000,
    };
  },
  global: true,
});
