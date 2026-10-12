import { PasswordService } from './password.service';
describe('scrypt credential storage', () => {
  it('salts independently, accepts full passwords beyond bcrypt cutoff, and rejects changes', async () => {
    const service = new PasswordService();
    const password = 'a'.repeat(80) + '끝';
    const first = await service.hash(password); const second = await service.hash(password);
    expect(first).not.toBe(second); expect(first).not.toContain(password);
    expect(await service.verify(password, first)).toBe(true);
    expect(await service.verify('a'.repeat(80) + '다름', first)).toBe(false);
    expect(await service.verify(password, 'invalid hash')).toBe(false);
  });
});
