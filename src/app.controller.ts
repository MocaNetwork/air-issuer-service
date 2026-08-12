import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from './common/guards/admin-api-key.guard';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { decryptText } from './common/utils/encryption';
import { IssuerService } from './issuer/issuer.service';

import { AvailableVcRequestBodyDto } from './issuer/dtos/available-vc-request-body.dto';
import { IssuanceHistoryRequestQueryDto } from './issuer/dtos/issuance-history-request-query.dto';
import { IssueVcRequestBodyDto } from './issuer/dtos/issue-vc-request-body.dto';
import { NonceParamDto } from './issuer/dtos/nonce-param.dto';
import { NonceRequestBodyDto } from './issuer/dtos/nonce-request-body.dto';

@Controller()
export class AppController {
  constructor(private readonly issuerService: IssuerService) {}

  @UseGuards(ApiKeyGuard)
  @Post('available-vc')
  async availableVc(@Body() body: AvailableVcRequestBodyDto) {
    return await this.issuerService.availableVc(
      {
        holderDID: body.holderDID,
        pubKey: body.pubKey,
        userId: body.userId,
      },
      {
        schemaId: body.schemaId,
        proofType: body.proofType,
      },
    );
  }

  @UseGuards(ApiKeyGuard)
  @Post('issue-vc')
  async issueVc(@Body() body: IssueVcRequestBodyDto) {
    return await this.issuerService.issueVc(
      body.schemaId,
      {
        holderDID: body.holderDID,
        encryptionKey: body.encryptionKey ?? body.pubKey,
        userId: body.userId,
        signingKey: body.signingKey ?? undefined,
      },
      body.proofType,
    );
  }

  @Get('credential-status/:nonce')
  async credentialStatus(@Param() { nonce }: NonceParamDto) {
    return await this.issuerService.credentialStatus(nonce);
  }

  @Get('revocation-status/:nonce')
  async revocationStatus(@Param() { nonce }: NonceParamDto) {
    return await this.issuerService.revocationStatus(nonce);
  }

  @UseGuards(AdminApiKeyGuard)
  @Get('admin/issuance-history')
  async adminIssuanceHistory(@Query() query: IssuanceHistoryRequestQueryDto) {
    return await this.issuerService.issuanceHistory(query ?? {});
  }

  @UseGuards(AdminApiKeyGuard)
  @Post('admin/revoke')
  async adminRevoke(@Body() body: NonceRequestBodyDto) {
    await this.issuerService.revoke(body.nonce);
  }
}
