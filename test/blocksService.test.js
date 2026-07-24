import { jest } from "@jest/globals";

import {
  blockUserById,
  getUserBlockStatus,
  hasAnyUserBlock,
  unblockUserById,
} from "../src/service/blocksService.js";

describe("blocks service - phase 3 trust controls", () => {
  test("getUserBlockStatus returns normalized relationship flags", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            is_blocked: 1,
            is_blocked_by_user: 0,
          },
        ],
      ]),
    };

    const result = await getUserBlockStatus(db, {
      currentUserId: 4,
      targetUserId: 9,
    });

    expect(result).toEqual({
      isBlocked: true,
      isBlockedByUser: false,
    });
  });

  test("getUserBlockStatus degrades gracefully when blocked_users does not exist yet", async () => {
    const db = {
      query: jest.fn().mockRejectedValueOnce({
        code: "ER_NO_SUCH_TABLE",
        message: "Table 'blocked_users' doesn't exist",
      }),
    };

    const result = await getUserBlockStatus(db, {
      currentUserId: 4,
      targetUserId: 9,
    });

    expect(result).toEqual({
      isBlocked: false,
      isBlockedByUser: false,
    });
  });

  test("hasAnyUserBlock collapses any active block into a boolean", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            is_blocked: 0,
            is_blocked_by_user: 1,
          },
        ],
      ]),
    };

    await expect(
      hasAnyUserBlock(db, {
        currentUserId: 4,
        targetUserId: 9,
      })
    ).resolves.toBe(true);
  });

  test("blockUserById creates the block and removes follows in both directions", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 2 }]),
    };

    const result = await blockUserById(db, {
      blockerId: 4,
      blockedId: 9,
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT IGNORE INTO blocked_users"),
      [4, 9]
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM follows"),
      [4, 9, 9, 4]
    );
    expect(result).toEqual({ affectedRows: 1 });
  });

  test("unblockUserById removes the block relation", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([{ affectedRows: 1 }]),
    };

    const result = await unblockUserById(db, {
      blockerId: 4,
      blockedId: 9,
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM blocked_users"),
      [4, 9]
    );
    expect(result).toEqual({ affectedRows: 1 });
  });
});
