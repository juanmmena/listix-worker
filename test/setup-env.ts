process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'test-jwt-access-secret-minimum-32-chars-long';
process.env.PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
process.env.APP_SCHEME = process.env.APP_SCHEME || 'listix';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/listix?schema=public';
