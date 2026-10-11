import { HttpException } from '@nestjs/common';
import { checkVersion, etag, requireIfMatch } from './if-match';

function expectError(work: () => unknown, status: number, code: string) {
  try {
    work();
    throw new Error('Expected rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(status);
    expect(error.getResponse()).toMatchObject({ code });
  }
}

describe('version preconditions', () => {
  it('rejects missing If-Match before any write', () => {
    expectError(() => requireIfMatch(), 428, 'IF_MATCH_REQUIRED');
  });
  it.each(['', '*', 'W/"1"', '1', '"0"', '"1", "2"', '"9007199254740992"'])(
    'rejects unsupported ETag %s', (header) => {
      expectError(() => requireIfMatch(header), 422, 'INVALID_INPUT');
    },
  );
  it('accepts the issued strong ETag and rejects a conflicting body version', () => {
    expect(requireIfMatch(etag(7), 7)).toBe(7);
    expectError(() => requireIfMatch('"7"', 6), 422, 'INVALID_INPUT');
  });
  it('reports the current version on stale writes', () => {
    expectError(() => checkVersion(1, 2), 409, 'VERSION_CONFLICT');
    expect(() => checkVersion(2, 2)).not.toThrow();
  });
});
