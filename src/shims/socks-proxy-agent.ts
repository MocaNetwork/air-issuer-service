import { createRequire } from 'node:module';

const cjsRequire = createRequire(__filename);
const { SocksProxyAgent } = cjsRequire('socks-proxy-agent') as {
  SocksProxyAgent: new (proxyUrl: string) => object;
};

export function createSocksProxyAgent(proxyUrl: string) {
  return new SocksProxyAgent(proxyUrl);
}
