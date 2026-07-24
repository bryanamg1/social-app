import { jest } from "@jest/globals";

import {
  getMessagesByConversation,
  getUserConversations,
  markConversationMessagesRead,
} from "../src/service/conversationsService.js";

describe("conversations service - phase 2 messaging maturity", () => {
  test("getUserConversations returns unread counters and last message read metadata", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            conversation_id: 12,
            participant_user_id: 9,
            participant_user_name: "Ana",
            last_message: "Hola",
            last_message_at: "2026-07-24T10:00:00.000Z",
            last_message_sender_id: 4,
            last_message_read_at: "2026-07-24T10:05:00.000Z",
            unread_count: 2,
          },
        ],
      ]),
    };

    const result = await getUserConversations(db, 4);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("AS unread_count"),
      [4, 4]
    );
    expect(result).toEqual([
      expect.objectContaining({
        conversation_id: 12,
        unread_count: 2,
        last_message_read_at: "2026-07-24T10:05:00.000Z",
      }),
    ]);
  });

  test("getMessagesByConversation exposes read metadata per message", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            message_id: 3,
            conversation_id: 12,
            sender_id: 4,
            content: "Hola",
            read_at: "2026-07-24T10:05:00.000Z",
            read_by_user_id: 9,
          },
        ],
      ]),
    };

    const result = await getMessagesByConversation(db, 12, 50, 0);

    expect(result[0]).toMatchObject({
      message_id: 3,
      read_by_user_id: 9,
    });
  });

  test("markConversationMessagesRead updates unread incoming messages only", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([{ affectedRows: 4 }]),
    };

    const result = await markConversationMessagesRead(db, 12, 4);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("SET read_at = CURRENT_TIMESTAMP"),
      [4, 12, 4]
    );
    expect(result.affectedRows).toBe(4);
    expect(typeof result.read_at).toBe("string");
  });
});
