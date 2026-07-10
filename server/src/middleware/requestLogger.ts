import morgan from 'morgan';
import { httpLogStream } from '../lib/logger';

export const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream: httpLogStream },
);
