import { Injectable } from '@nestjs/common';
import { UnauthenticatedError } from '../domain/auth.errors';
import { UserRepository } from '../domain/repositories';
import { User } from '../domain/user';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthenticatedError();
    }
    return user;
  }
}
