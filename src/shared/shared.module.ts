import { Global, Module } from '@nestjs/common';
import { CryptoService } from './application/crypto.service';
import { Clock } from './domain/clock';
import { NodeCryptoService } from './infrastructure/node-crypto.service';
import { SystemClock } from './infrastructure/system-clock';

@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: CryptoService, useClass: NodeCryptoService },
  ],
  exports: [Clock, CryptoService],
})
export class SharedModule {}
