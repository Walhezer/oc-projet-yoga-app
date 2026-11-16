import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from './jwt.util';

describe('JWT Util', () => {
  it('should generate a valid JWT token for a given userId', () => {
    const token = generateToken(42);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify a valid token and return the decoded payload', () => {
    const token = generateToken(42);
    const decoded = verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe(42);
  });

  it('should return null when verifying an invalid or malformed token', () => {
    const decoded = verifyToken('invalid.token.string');
    expect(decoded).toBeNull();
  });
});