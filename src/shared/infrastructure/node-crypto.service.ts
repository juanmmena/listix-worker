import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { CryptoService } from '../application/crypto.service';

@Injectable()
export class NodeCryptoService extends CryptoService {
  uuid(): string {
    return randomUUID();
  }

  randomHex(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }

  randomString(length: number, alphabet: string): string {
    return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
  }

  sha256Hex(value: string): string {
    return createHash('sha256').update(value.trim(), 'utf8').digest('hex');
  }
}
