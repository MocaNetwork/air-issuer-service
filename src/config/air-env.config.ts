import { registerAs } from '@nestjs/config';

export const AIR_ENVS = ['sandbox', 'prod'] as const;
export type AirEnvName = (typeof AIR_ENVS)[number];

const PRESETS = {
  sandbox: {
    airApiOrigin: 'https://air.api.sandbox.air3.com',
    mocaChainApiOrigin: 'https://api.sandbox.mocachain.org',
    iden3Method: 'air',
    iden3Blockchain: 'id',
    iden3NetworkId: 'testnet',
  },
  prod: {
    airApiOrigin: 'https://air.api.air3.com',
    mocaChainApiOrigin: 'https://mocachain-mainnet.api.air3.com',
    iden3Method: 'air',
    iden3Blockchain: 'id',
    iden3NetworkId: 'main',
  },
} as const;

export type AirEnvConfig = { env: AirEnvName } & (typeof PRESETS)[AirEnvName];

export function resolveAirEnv(raw = process.env.AIR_ENV): AirEnvConfig {
  if (!raw || !(raw in PRESETS)) {
    throw new Error(`AIR_ENV must be one of: ${AIR_ENVS.join(', ')}`);
  }

  const env = raw as AirEnvName;
  return { env, ...PRESETS[env] };
}

export default registerAs('air', () => resolveAirEnv());
