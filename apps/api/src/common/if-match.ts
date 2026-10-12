import { HttpException } from '@nestjs/common';

export function fail(status: number, code: string, details = {}): never {
  throw new HttpException({ code, message: code, details }, status);
}

// Only the strong, quoted integer ETag issued by this API is accepted.
export function requireIfMatch(header?: string, bodyVersion?: number): number {
  if (header === undefined) fail(428, 'IF_MATCH_REQUIRED');
  if (!/^"[1-9]\d*"$/.test(header)) fail(422, 'INVALID_INPUT');
  const version = Number(header.slice(1, -1));
  if (!Number.isSafeInteger(version)) fail(422, 'INVALID_INPUT');
  if (bodyVersion !== undefined && bodyVersion !== version) {
    fail(422, 'INVALID_INPUT');
  }
  return version;
}

export function checkVersion(expected: number, actual: number) {
  if (expected !== actual) fail(409, 'VERSION_CONFLICT', { version: actual });
}

export function etag(version: number): string {
  return `"${version}"`;
}
