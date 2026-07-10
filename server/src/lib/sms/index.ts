import { env } from '../../config/env';
import { ConsoleSms } from './consoleSms';
import { Msg91Sms } from './msg91Sms';
import type { SmsProvider } from './sms.types';

export type { SmsProvider } from './sms.types';

let instance: SmsProvider | undefined;

export function getSms(): SmsProvider {
  if (!instance) {
    instance = env.SMS_PROVIDER === 'msg91' ? new Msg91Sms() : new ConsoleSms();
  }
  return instance;
}
