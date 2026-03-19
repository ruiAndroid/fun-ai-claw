export interface UserCenterMe {
  userId: string;
  uid: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneMasked?: string | null;
  phoneE164?: string | null;
  userType?: string | null;
  invitationCode?: string | null;
  payUserId?: string | null;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface UserCenterVipInfo {
  userId: string;
  username: string;
  isVip: boolean;
  validStartTime: string;
  validEndTime: string;
  coinAmount: number;
  isBuyMaterial: boolean;
}

export interface UserCenterOrderRecord {
  id: string;
  created: string;
  updated: string;
  userId: string;
  orderCode: string;
  orderType: string;
  ticketId: string;
  couponCode: string;
  payMoney: number;
  consumeMoney: number;
  payGatewayId: string;
  payPara: string;
  payType: number;
  billStatus: number;
  validBeginTime: string;
  validEndTime: string;
  commodityId: string;
  commodityName: string;
  coinAmount: number;
  status: string;
  statusUpdateTime: string;
  refundStatus: number;
  refundAmount: number;
  refundTime: string;
  remark: string;
  createdBy: string;
  gorderCode: string;
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

export interface UserCenterUserInfo {
  id: number | string;
  type?: number | string | null;
  username?: string | null;
  userName?: string | null;
  avatar?: string | null;
  invitationCode?: string | null;
  phone?: string | null;
  payUserId?: number | string | null;
  lastLogin?: string | null;
  status?: number | string | null;
}

export interface UserCenterVipInfoResponseData {
  userId?: number | string | null;
  username?: string | null;
  isVip?: number | string | boolean | null;
  validStartTime?: string | null;
  validEndTime?: string | null;
  coinAmount?: number | string | null;
  isBuyMaterial?: number | string | boolean | null;
}

export interface UserCenterOrderRecordResponseData {
  id?: number | string | null;
  created?: string | null;
  updated?: string | null;
  userId?: number | string | null;
  orderCode?: string | null;
  orderType?: string | null;
  ticketId?: number | string | null;
  couponCode?: string | null;
  payMoney?: number | string | null;
  consumeMoney?: number | string | null;
  payGatewayId?: number | string | null;
  payPara?: string | null;
  payType?: number | string | null;
  billStatus?: number | string | null;
  validBeginTime?: string | null;
  validEndTime?: string | null;
  commodityId?: number | string | null;
  commodityName?: string | null;
  coinAmount?: number | string | null;
  status?: string | null;
  statusUpdateTime?: string | null;
  refundStatus?: number | string | null;
  refundAmount?: number | string | null;
  refundTime?: string | null;
  remark?: string | null;
  createdBy?: number | string | null;
  gorderCode?: string | null;
}

export interface UserCenterLoginResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType?: string | null;
  expiresIn?: number | null;
  userInfo: UserCenterUserInfo;
}

export type UserCenterCurrentUserResponseData = UserCenterUserInfo;

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
