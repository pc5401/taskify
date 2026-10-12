import { AuthService } from './auth.service';
describe('auth orchestration and non-disclosing login', () => {
  it('uses password verification for unknown and known wrong-password accounts without issuing sessions', async () => {
    const user = { id: 'user', passwordHash: 'scrypt-v1$' + '0'.repeat(32) + '$' + '0'.repeat(128) };
    const db: any = { user: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(user) } };
    const sessions: any = { issueForAuthenticatedUser: jest.fn() };
    const passwords: any = { verify: jest.fn().mockResolvedValue(false) };
    const service = new AuthService(db, sessions, passwords);
    for (const email of ['unknown@example.test', 'Case@example.test']) {
      await expect(service.login({ email, password: 'wrong' })).rejects.toMatchObject({ status: 401, response: { code: 'INVALID_CREDENTIALS' } });
    }
    expect(passwords.verify).toHaveBeenCalledTimes(2);
    expect(passwords.verify.mock.calls[0]).toEqual(passwords.verify.mock.calls[1]);
    expect(sessions.issueForAuthenticatedUser).not.toHaveBeenCalled();
  });
  it('keeps user creation and session issuance in the same transaction and propagates failure', async () => {
    const tx: any = { user: { create: jest.fn(async () => ({ id: 'user' })) } };
    const db: any = { $transaction: jest.fn(async work => work(tx)) };
    const sessions: any = { issueForAuthenticatedUser: jest.fn().mockRejectedValue(new Error('issuance failure')) };
    const passwords: any = { hash: jest.fn().mockResolvedValue('stored hash') };
    await expect(new AuthService(db, sessions, passwords).register({ email: 'Exact@example.test', password: '12345678', nickname: 'x' })).rejects.toThrow('issuance failure');
    expect(sessions.issueForAuthenticatedUser).toHaveBeenCalledWith('user', tx);
    expect(tx.user.create).toHaveBeenCalledWith({ data: { email: 'Exact@example.test', nickname: 'x', passwordHash: 'stored hash' } });
  });
});
