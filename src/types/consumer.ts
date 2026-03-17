export interface ConsumerAccount {
  accountId: string;
  externalUserId: string;
  externalUid?: string | null;
  sourceSystem: string;
  phoneE164?: string | null;
  phoneMasked?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  status: string;
  externalCreatedAt?: string | null;
  linkedAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  lastVerifiedAt: string;
  activeSessionCount: number;
  activeInstanceCount: number;
}

export interface ConsumerBoundInstance {
  bindingId: string;
  instanceId: string;
  name: string;
  image: string;
  gatewayHostPort?: number | null;
  gatewayUrl?: string | null;
  remoteConnectCommand?: string | null;
  runtime: string;
  status: string;
  desiredState: string;
  restartRequired: boolean;
  bindingStatus: string;
  sourceType: string;
  remark?: string | null;
  boundAt: string;
  bindingUpdatedAt: string;
  instanceCreatedAt: string;
  instanceUpdatedAt: string;
}
