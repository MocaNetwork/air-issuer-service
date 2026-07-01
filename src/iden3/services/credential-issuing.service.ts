import { EntityManager } from '@mikro-orm/postgresql';
import { Blockchain, DID, DidMethod, NetworkId } from '@mocanetwork/moca-iden3';
import {
  BjjProvider,
  CredentialRequest,
  CredentialStatusType,
  CredentialStorage,
  CredentialWallet,
  IDataStorage,
  Identity,
  IdentityStorage,
  IdentityWallet,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  InMemoryPrivateKeyStore,
  KMS,
  KmsKeyType,
  MerklizedRootPosition,
  Profile,
  SubjectPosition,
  W3CCredential,
} from '@mocanetwork/privado-js-sdk';
import { HttpService } from '@nestjs/axios';
import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encryptText } from '../../common/utils/encryption';
import { hexStrToBuffer } from '../../common/utils/string';
import { createDocumentLoader } from '../lib/document-loader';

import { DStorageAPIService } from '../../dstorage/services/dstorage-api.service';
import { Credential } from '../entities/credential.entity';
import { Revocation } from '../entities/revocation.entity';

@Injectable()
export class CredentialIssuingService implements OnModuleInit {
  private readonly issuerOrigin: string;
  private readonly documentLoader = createDocumentLoader(this.httpService);
  private readonly dataStorage: IDataStorage;
  private readonly credentialWallet: CredentialWallet;
  private readonly identityWallet: IdentityWallet;
  private issuerDID: DID;

  constructor(
    private readonly configService: ConfigService,
    private readonly dStorageAPIService: DStorageAPIService,
    private readonly httpService: HttpService,
    private readonly entityManager: EntityManager,
  ) {
    this.issuerOrigin = this.configService.getOrThrow<string>('ISSUER_ORIGIN').trim().replace(/\/+$/, '');
    this.dataStorage = {
      credential: new CredentialStorage(new InMemoryDataSource<W3CCredential>()),
      identity: new IdentityStorage(new InMemoryDataSource<Identity>(), new InMemoryDataSource<Profile>()),
      mt: new InMemoryMerkleTreeStorage(40),
      states: { getRpcProvider: () => null } as any,
    };
    const memoryKeyStore = new InMemoryPrivateKeyStore();
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, memoryKeyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

    this.credentialWallet = new CredentialWallet(this.dataStorage);
    this.identityWallet = new IdentityWallet(kms, this.dataStorage, this.credentialWallet);
  }

  async onModuleInit() {
    const seed = this.configService.getOrThrow<string>('SEED');
    const issuerIdentity = await this.identityWallet.createIdentity({
      method: DidMethod.Air,
      blockchain: Blockchain.Id,
      networkId: NetworkId.Testnet,
      seed: hexStrToBuffer(seed),
      revocationOpts: {
        type: CredentialStatusType.SparseMerkleTreeProof,
        id: `${this.issuerOrigin}/credential-status`,
        nonce: 0,
        genesisPublishingDisabled: false,
      },
    });
    this.issuerDID = issuerIdentity.did;
  }

  async issue(opts: {
    credentialSchema: string;
    type: string;
    merklizedRootPosition: MerklizedRootPosition;
    credentialSubject: { id: string } & any;
    expiration: number;
  }) {
    this.assertSetupState();
    const credentialRequest: CredentialRequest = {
      ...opts,
      merklizedRootPosition: MerklizedRootPosition.Value,
      subjectPosition: SubjectPosition.Index,
      revocationOpts: {
        type: CredentialStatusType.SparseMerkleTreeProof,
        id: `${this.issuerOrigin}/credential-status`,
      },
    };

    const credential = await this.identityWallet.issueCredential(this.issuerDID, credentialRequest, {
      documentLoader: this.documentLoader,
    });

    const credentialDoc = credential.toJSON();

    const credentialRecord = new Credential();
    credentialRecord.holder = opts.credentialSubject.id as string;
    credentialRecord.document = credentialDoc;
    credentialRecord.nonce = credentialDoc.credentialStatus.revocationNonce!.toString();
    credentialRecord.createdAt = new Date();

    await this.entityManager.persist(credentialRecord).flush();
    return credentialDoc;
  }

  async credentialStatus(nonce: string) {
    // TODO: implement tree state management
    // when MTP-based credentials becomes enabled.
    // const treeStateSnapshot = ...;

    const {
      proof,
      treeState: { state, claimsRoot, rootOfRoots, revocationRoot },
    } = await this.identityWallet.generateNonRevocationMtpWithNonce(this.issuerDID, BigInt(nonce));

    return {
      proof: {
        ...proof.toJSON(),
        // NOTE: fake `existence` logic
        existence: await this.isRevoked(nonce),
      },
      treeState: {
        state: state.hex(),
        claimsRoot: claimsRoot.hex(),
        rootOfRoots: rootOfRoots.hex(),
        revocationRoot: revocationRoot.hex(),
      },
    };
  }

  async revoke(nonce: string) {
    this.assertSetupState();

    const existing = await this.entityManager.findOne(Revocation, { nonce });
    if (existing) return existing;

    const revocation = new Revocation();
    revocation.nonce = nonce;
    revocation.createdAt = new Date();
    await this.entityManager.persist(revocation).flush();

    return revocation;
  }

  async isRevoked(nonce: string): Promise<boolean> {
    return await this.entityManager.count(Revocation, { nonce }).then((e) => e > 0);
  }

  async encrypt(text: string, pubKeyHexString: string, opts?: { encoding: 'hex' | 'base64' }) {
    // NOTE: Temporarily placed here just for example integration ease
    const pubKey = hexStrToBuffer(pubKeyHexString);
    return await encryptText(text, pubKey, opts);
  }

  async dstorageUpload(
    opts: {
      holderDID: string;
      schemaId: string;
      expiresAt: string;
      credential: {
        encryptedData: string;
        iv: string;
        authTag: string;
        dataEncPublicKey: string;
      };
    },
    info: { partnerJwt: string },
  ) {
    // NOTE: Temporarily placed here just for example integration ease
    return await this.dStorageAPIService.createObject(
      {
        holderDid: opts.holderDID,
        schemaId: opts.schemaId,
        // expiresAt: opts.expiresAt,
        data: opts.credential.encryptedData,
        iv: opts.credential.iv,
        authTag: opts.credential.authTag,
        encryptedKey: opts.credential.dataEncPublicKey,
      },
      { 'x-partner-auth': info.partnerJwt },
    );
  }

  private assertSetupState() {
    if (!this.issuerDID) {
      throw new ServiceUnavailableException('Server initializing');
    }
  }
}
