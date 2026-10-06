export interface TransactionOptions {
  lockKey?: string;
}

export abstract class TransactionManager {
  abstract run<T>(work: () => Promise<T>, options?: TransactionOptions): Promise<T>;
}
