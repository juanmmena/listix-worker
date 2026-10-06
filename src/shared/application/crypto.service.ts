export abstract class CryptoService {
  abstract uuid(): string;
  abstract randomHex(bytes: number): string;
  abstract randomString(length: number, alphabet: string): string;
  abstract sha256Hex(value: string): string;
}
