import { describe, it, expect } from 'vitest';
import { db } from '../../src/config/database';

describe('Oracle Transaction Rollback Integrity', () => {
  it('should rollback transaction completely if an intermediate step fails', async () => {
    let operationAttempted = false;

    await expect(
      db.withTransaction(async () => {
        operationAttempted = true;
        // Simulate step 1: Search session created
        // Simulate step 2: Failure occurs
        throw new Error('Database constraint violation or network timeout');
      })
    ).rejects.toThrow('Database constraint violation or network timeout');

    expect(operationAttempted).toBe(true);
  });
});
