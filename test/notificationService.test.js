import { jest } from "@jest/globals";

import {
  NOTIFICATION_TYPES,
  createNotification,
  getnotifications,
  markseen,
} from "../src/service/notificationService.js";

const createIoMock = () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  const of = jest.fn(() => ({ to }));

  return {
    io: { of },
    emit,
    to,
    of,
  };
};

describe("notification service - phase 2 messaging maturity", () => {
  test("getnotifications returns enriched rows for the authenticated user", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            id: 91,
            user_id: 4,
            type: NOTIFICATION_TYPES.FOLLOW_USER,
            relate_id: 8,
            from_user_id: 8,
            from_user_name: "Bryan",
            seen: 0,
            created_at: "2026-07-24T15:00:00.000Z",
          },
        ],
      ]),
    };

    const result = await getnotifications(4, db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM notifications n"),
      [4]
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 91,
        user_id: 4,
        from_user_name: "Bryan",
      }),
    ]);
  });

  test("createNotification emits the enriched notification payload and unread count", async () => {
    const ioMock = createIoMock();
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ insertId: 45 }])
        .mockResolvedValueOnce([
          [
            {
              id: 45,
              user_id: 2,
              type: NOTIFICATION_TYPES.MESSAGE,
              relate_id: 13,
              from_user_id: 7,
              from_user_name: "Test Sender",
              conversation_id: 13,
              message_preview: "Hola desde realtime",
              seen: 0,
            },
          ],
        ])
        .mockResolvedValueOnce([[{ total: 3 }]]),
    };

    const result = await createNotification(
      2,
      NOTIFICATION_TYPES.MESSAGE,
      13,
      7,
      db,
      ioMock.io
    );

    expect(result).toBe(45);
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO notifications"),
      [2, NOTIFICATION_TYPES.MESSAGE, 13, 7]
    );
    expect(ioMock.to).toHaveBeenNthCalledWith(1, "user_2");
    expect(ioMock.emit).toHaveBeenNthCalledWith(
      1,
      "notification:new",
      expect.objectContaining({
        id: 45,
        conversation_id: 13,
        message_preview: "Hola desde realtime",
      })
    );
    expect(ioMock.emit).toHaveBeenNthCalledWith(2, "notification:count", {
      total: 3,
    });
  });

  test("markseen updates the notification and broadcasts the new unread count", async () => {
    const ioMock = createIoMock();
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([
          [
            {
              id: 54,
              user_id: 9,
              type: NOTIFICATION_TYPES.COMMENT_POST,
              relate_id: 88,
              from_user_id: 2,
              from_user_name: "User 2",
              post_id: 88,
              post_content: "Nuevo avance del proyecto",
              seen: 1,
            },
          ],
        ])
        .mockResolvedValueOnce([[{ total: 1 }]]),
    };

    const result = await markseen(54, 9, db, ioMock.io);

    expect(result).toEqual(
      expect.objectContaining({
        id: 54,
        seen: 1,
        post_id: 88,
      })
    );
    expect(ioMock.emit).toHaveBeenCalledWith("notification:count", { total: 1 });
  });
});
