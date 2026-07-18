import { env } from '../../config/configuration';
import { Payment, PaymentGateway } from '../../database/entities';

export interface GatewayRequest {
  paymentId: number;
  amount: number;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
}

export interface GatewayStartResult {
  authority: string;
  redirectUrl: string;
  payload?: unknown;
}

export interface GatewayVerifyResult {
  success: boolean;
  refId: string | null;
  payload?: unknown;
}

export interface GatewayAdapter {
  key: PaymentGateway;
  title: string;
  isConfigured(): boolean;
  request(args: GatewayRequest): Promise<GatewayStartResult>;
  /** استخراج authority از پارامترهای callback */
  extractAuthority(query: Record<string, string>): string | null;
  verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult>;
}

const jsonPost = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({})) as Promise<any>;
};

const formPost = async (url: string, body: Record<string, unknown>) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)] as [string, string])).toString(),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// ---------------------------------------------------------------- زرین‌پال
export class ZarinpalAdapter implements GatewayAdapter {
  key = 'zarinpal' as const;
  title = 'زرین‌پال';
  private base() {
    return env.payment.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://payment.zarinpal.com/pg/v4/payment';
  }
  isConfigured() {
    return !!env.payment.zarinpalMerchantId;
  }
  async request({ paymentId, amount, description, callbackUrl, mobile }: GatewayRequest): Promise<GatewayStartResult> {
    const json = await jsonPost(`${this.base()}/request.json`, {
      merchant_id: env.payment.zarinpalMerchantId,
      amount,
      callback_url: `${callbackUrl}/zarinpal`,
      description,
      metadata: mobile ? { mobile } : undefined,
    });
    const authority = json?.data?.authority;
    if (!authority || json?.data?.code !== 100)
      throw new Error(json?.errors?.message || 'خطای زرین‌پال: ' + (json?.errors?.code ?? 'نامشخص'));
    const base = env.payment.zarinpalSandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://payment.zarinpal.com/pg/StartPay';
    return { authority, redirectUrl: `${base}/${authority}`, payload: { paymentId, raw: json } };
  }
  extractAuthority(q: Record<string, string>) {
    return q.authority || q.Authority || null;
  }
  async verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult> {
    const status = query.status || query.Status;
    if (status !== 'OK') return { success: false, refId: null };
    const json = await jsonPost(`${this.base()}/verify.json`, {
      merchant_id: env.payment.zarinpalMerchantId,
      amount: Number(payment.amount),
      authority: payment.authority,
    });
    const ok = json?.data?.code === 100 || json?.data?.code === 101;
    return { success: ok, refId: json?.data?.ref_id ? String(json.data.ref_id) : null, payload: json };
  }
}

// ---------------------------------------------------------------- آیدی‌پی
export class IdpayAdapter implements GatewayAdapter {
  key = 'idpay' as const;
  title = 'آیدی‌پی';
  private headers() {
    const h: Record<string, string> = { 'X-API-KEY': env.payment.idpayApiKey };
    if (env.payment.idpaySandbox) h['X-SANDBOX'] = '1';
    return h;
  }
  isConfigured() {
    return !!env.payment.idpayApiKey;
  }
  async request({ paymentId, amount, description, callbackUrl, mobile }: GatewayRequest): Promise<GatewayStartResult> {
    const json = await jsonPost(
      'https://api.idpay.ir/v1.1/payment',
      {
        order_id: String(paymentId),
        amount,
        callback: `${callbackUrl}/idpay`,
        desc: description,
        phone: mobile || undefined,
      },
      this.headers(),
    );
    if (!json?.id || !json?.link) throw new Error(json?.error_message || 'خطای آیدی‌پی');
    return { authority: json.id, redirectUrl: json.link, payload: json };
  }
  extractAuthority(q: Record<string, string>) {
    return q.id || null;
  }
  async verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult> {
    if (String(query.status) !== '100') return { success: false, refId: null };
    const json = await jsonPost(
      'https://api.idpay.ir/v1.1/payment/verify',
      { id: payment.authority, order_id: String(payment.id) },
      this.headers(),
    );
    const ok = json?.status === 100 || json?.status === 101;
    return { success: ok, refId: json?.track_id ? String(json.track_id) : null, payload: json };
  }
}

// ---------------------------------------------------------------- نکست‌پی
export class NextpayAdapter implements GatewayAdapter {
  key = 'nextpay' as const;
  title = 'نکست‌پی';
  isConfigured() {
    return !!env.payment.nextpayApiKey;
  }
  async request({ paymentId, amount, callbackUrl }: GatewayRequest): Promise<GatewayStartResult> {
    // نکست‌پی مبلغ را «تومان» می‌گیرد
    const json: any = await formPost('https://nextpay.org/nx/gateway/token', {
      api_key: env.payment.nextpayApiKey,
      amount: Math.ceil(amount / 10),
      order_id: String(paymentId),
      callback_uri: `${callbackUrl}/nextpay`,
    });
    const transId = json?.trans_id;
    if (!transId || (json.code && Number(json.code) !== -1)) throw new Error(`خطای نکست‌پی (کد ${json?.code ?? '?'})`);
    return { authority: transId, redirectUrl: `https://nextpay.org/nx/gateway/payment/${transId}`, payload: json };
  }
  extractAuthority(q: Record<string, string>) {
    return q.trans_id || null;
  }
  async verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult> {
    if (!query.trans_id) return { success: false, refId: null };
    const json: any = await formPost('https://nextpay.org/nx/gateway/verify', {
      api_key: env.payment.nextpayApiKey,
      trans_id: payment.authority as string,
      amount: Math.ceil(Number(payment.amount) / 10),
    });
    const ok = Number(json?.code) === 0;
    return { success: ok, refId: ok ? String(payment.authority) : null, payload: json };
  }
}

// ---------------------------------------------------------------- بانک ملت (به‌پرداخت)
const MELLAT_PGW = 'https://bpm.shaparak.ir/pgwchannel/services/pgw?wsdl';
function mellatSoap(method: string, fields: Record<string, string | number>) {
  const body = Object.entries(fields)
    .map(([k, v]) => `<int:${k}>${v}</int:${k}>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://interfaces.core.sw.bps.com/">
  <soapenv:Header/><soapenv:Body><int:${method}>${body}</int:${method}></soapenv:Body>
</soapenv:Envelope>`;
}
async function mellatCall(method: string, fields: Record<string, string | number>): Promise<string> {
  const res = await fetch(MELLAT_PGW, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    body: mellatSoap(method, fields),
  });
  const xml = await res.text();
  const m = xml.match(/<return>([^<]*)<\/return>/);
  return m?.[1] ?? '';
}

export class MellatAdapter implements GatewayAdapter {
  key = 'mellat' as const;
  title = 'بانک ملت';
  isConfigured() {
    return !!(env.payment.mellatTerminalId && env.payment.mellatUsername && env.payment.mellatPassword);
  }
  private creds() {
    return {
      terminalId: env.payment.mellatTerminalId,
      userName: env.payment.mellatUsername,
      userPassword: env.payment.mellatPassword,
    };
  }
  async request({ paymentId, amount, callbackUrl }: GatewayRequest): Promise<GatewayStartResult> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const result = await mellatCall('bpPayRequest', {
      ...this.creds(),
      orderId: paymentId,
      amount,
      localDate: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
      localTime: `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
      additionalData: '',
      callBackUrl: `${callbackUrl}/mellat`,
      payerId: '0',
    });
    const [code, refId] = result.split(',');
    if (code !== '0' || !refId) throw new Error(`خطای بانک ملت (کد ${code || '?'})`);
    return { authority: refId, redirectUrl: `https://bpm.shaparak.ir/pgwchannel/startpay.mellat?RefId=${encodeURIComponent(refId)}`, payload: result };
  }
  extractAuthority(q: Record<string, string>) {
    return q.RefId || q.refId || null;
  }
  async verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult> {
    const resCode = query.ResCode;
    const saleOrderId = query.SaleOrderId;
    const saleReferenceId = query.SaleReferenceId;
    if (resCode !== '0' || !saleOrderId || !saleReferenceId) {
      return { success: false, refId: null, payload: query };
    }
    const common = {
      ...this.creds(),
      orderId: payment.id,
      saleOrderId,
      saleReferenceId,
    };
    const verifyCode = await mellatCall('bpVerifyRequest', common);
    if (verifyCode.split(',')[0] !== '0') {
      // برگشت تراکنش
      await mellatCall('bpReversalRequest', common).catch(() => '');
      return { success: false, refId: null, payload: { verifyCode } };
    }
    const settleCode = await mellatCall('bpSettleRequest', common).catch(() => '45');
    const settled = ['0', '45'].includes(String(settleCode).split(',')[0]);
    return { success: settled, refId: saleReferenceId, payload: { verifyCode, settleCode } };
  }
}

// ---------------------------------------------------------------- بانک سامان (SEP)
export class SamanAdapter implements GatewayAdapter {
  key = 'saman' as const;
  title = 'بانک سامان';
  isConfigured() {
    return !!env.payment.samanTerminalId;
  }
  async request({ paymentId, amount, callbackUrl, mobile }: GatewayRequest): Promise<GatewayStartResult> {
    const json = await jsonPost('https://sep.shaparak.ir/onlinepg/onlinepg', {
      action: 'token',
      TerminalId: env.payment.samanTerminalId,
      Amount: amount,
      ResNum: String(paymentId),
      RedirectUrl: `${callbackUrl}/saman`,
      CellNumber: mobile || undefined,
    });
    if (json?.status !== 1 || !json?.token) throw new Error(json?.errorDesc || `خطای بانک سامان (کد ${json?.status ?? '?'})`);
    return {
      authority: json.token,
      redirectUrl: `https://sep.shaparak.ir/OnlinePG/SendToken?token=${json.token}`,
      payload: json,
    };
  }
  extractAuthority(q: Record<string, string>) {
    return q.Token || q.token || null;
  }
  async verify(payment: Payment, query: Record<string, string>): Promise<GatewayVerifyResult> {
    const state = query.State || query.state;
    const refNum = query.RefNum || query.RefNum;
    if (state !== 'OK' || !refNum) return { success: false, refId: null, payload: query };
    const json = await jsonPost('https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction', {
      RefNum: refNum,
      TerminalId: env.payment.samanTerminalId,
    });
    const ok = json?.Success === true && Number(json?.ResultCode) === 0;
    return { success: ok, refId: refNum, payload: json };
  }
}

export const GATEWAY_ADAPTERS: Record<string, GatewayAdapter> = {
  zarinpal: new ZarinpalAdapter(),
  idpay: new IdpayAdapter(),
  nextpay: new NextpayAdapter(),
  mellat: new MellatAdapter(),
  saman: new SamanAdapter(),
};

export function gatewayAdapter(key: string): GatewayAdapter | null {
  return GATEWAY_ADAPTERS[key] ?? null;
}
