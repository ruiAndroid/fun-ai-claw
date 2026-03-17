export interface UserCenterMe {
  userId: string;
  uid: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  phoneMasked: string;
  phoneE164?: string | null;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface UserCenterSmsSendCodeRequest {
  phone: string;
}

export interface UserCenterSmsSendCodeResponse {
  phoneMasked: string;
  cooldownSeconds: number;
  expiresAt: string;
  debugCode?: string | null;
}

export interface UserCenterSmsVerifyRequest {
  phone: string;
  code: string;
  inviteCode?: string | null;
}

export interface UserCenterAuthResponse {
  me: UserCenterMe;
  newUser: boolean;
  tokenType: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface UserCenterRefreshTokenRequest {
  refreshToken?: string | null;
}

export interface UserCenterAuthSnapshot {
  tokenType?: string | null;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
  sessionKey: string;
}
