import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { createHeaderAndPayload, StatusList, StatusType } from '@owf/token-status-list';
import { SdJwtVc } from '../entities/sd-jwt-vc.entity';
import { ConfigService } from '@nestjs/config';

export const PARTITION_COUNT = 1_000_000; // WARNING: DO NOT CHANGE

@Injectable()
export class TokenStatusListService {
  private readonly issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN');

  constructor(
    private readonly entityManager: EntityManager,
    private readonly configService: ConfigService,
  ) {}

  async generate() {
    const maxBit = await this.entityManager
      .findOne(SdJwtVc, { id: { $ne: null } }, { orderBy: [{ id: QueryOrder.DESC }] })
      .then((e) => Number(e?.id?.toString() ?? '0'));
    const batchCount = Math.ceil(maxBit / PARTITION_COUNT);
    const statusLists: StatusList[] = [];

    const limit = Number(PARTITION_COUNT);
    for (let page = 0; page < batchCount; page++) {
      const offset = page * limit;
      const statusList = new StatusList(new Array<number>(Number(PARTITION_COUNT)).fill(0), 1);
      const batch = await this.entityManager.find(
        SdJwtVc,
        { id: { $gte: offset, $lt: offset + limit }, revoked: true },
        {
          fields: ['id', 'revoked'],
          orderBy: [{ id: QueryOrder.DESC }],
        },
      );
      batch.forEach((e) => {
        const index = Number(e.id) - 1;
        statusList.setStatus(index, StatusType.Invalid);
      });
      statusLists.push(statusList);
    }

    const payloads = statusLists.map((l) => {
      return createHeaderAndPayload(
        l,
        {
          iss: 'https://issuer.example',
          sub: 'https://issuer.example/statuslists/1',
          iat: Math.floor(Date.now() / 1000),
        },
        { alg: 'ES256', typ: 'statuslist+jwt' },
      );
    });

    console.log(payloads);
    return { maxBit, batchCount, payloads: payloads.map((e) => JSON.stringify(e)) };
  }
}
