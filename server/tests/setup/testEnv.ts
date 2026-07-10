import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

process.env.NODE_ENV = 'test';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
process.env.MAILER_PROVIDER = process.env.MAILER_PROVIDER || 'console';
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || 'console';
