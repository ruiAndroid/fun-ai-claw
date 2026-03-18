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

export interface UserCenterApiEnvelope<T> {
  code: number;
  msg?: string | null;
  requestId?: string | null;
  data: T;
}

export interface UserCenterSmsSendCodeRequest {
  phone: string;
}

export interface UserCenterSmsSendCodeResponse {
  requestId?: string | null;
  msg?: string | null;
}

export interface UserCenterSmsVerifyRequest {
  phone: string;
  code: string;
  inviteCode?: string | null;
}

export interface UserCenterLoginUserInfo {
  id: number | string;
  type?: number | string | null;
  userName?: string | null;
  avatar?: string | null;
  invitationCode?: string | null;
  phone?: string | null;
  payUserId?: number | string | null;
  lastLogin?: string | null;
  status?: number | string | null;
}

export interface UserCenterLoginResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType?: string | null;
  expiresIn?: number | null;
  userInfo: UserCenterLoginUserInfo;
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
