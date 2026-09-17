export interface InitializeUserRequestBody {
  partnerJwt: string;
}

export interface InitializeUserResponseBody {
  userId: string | null;
  did: string | null;
  publicKey: string | null;
  status: string | null;
  signingKey: { jwk: JsonWebKey } | null;
}
