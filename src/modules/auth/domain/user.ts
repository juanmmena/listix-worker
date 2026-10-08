export class User {
  constructor(
    readonly id: string,
    readonly displayName: string | null,
    readonly createdAt: Date,
    readonly lastSeenAt: Date,
  ) {}

  static anonymous(id: string, now: Date): User {
    return new User(id, null, now, now);
  }
}
