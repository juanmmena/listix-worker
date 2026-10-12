import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../shared/application/crypto.service';
import { InviteCredential } from '../domain/invite-credential';
import { InviteRepository } from '../domain/invite.repository';
import { InviteNotFoundError } from '../domain/invites.errors';
import { ListInvite } from '../domain/list-invite';

@Injectable()
export class InviteFinder {
  constructor(
    private readonly invites: InviteRepository,
    private readonly crypto: CryptoService,
  ) {}

  async find(credential: InviteCredential): Promise<ListInvite> {
    const invite =
      credential.kind === 'code'
        ? await this.invites.findLatestByCode(credential.value)
        : await this.invites.findLatestByTokenHash(this.crypto.sha256Hex(credential.value));
    if (!invite) {
      throw new InviteNotFoundError();
    }
    return invite;
  }
}
