import { jest } from "@jest/globals";
import {
  deleteCommentThread,
  updateCommentText,
} from "../src/service/commentService.js";

describe("comment service - phase 1 social core", () => {
  test("updateCommentText updates the comment body and returns the refreshed row", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([
          [
            {
              comment_id: 15,
              user_id: 4,
              comment_text: "Comentario editado",
            },
          ],
        ]),
    };

    const result = await updateCommentText(db, {
      commentId: 15,
      userId: 4,
      commentText: "Comentario editado",
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE comments"),
      ["Comentario editado", 15, 4]
    );
    expect(result).toMatchObject({
      comment_id: 15,
      user_id: 4,
      comment_text: "Comentario editado",
    });
  });

  test("deleteCommentThread removes reactions and all descendant comments", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ comment_id: 10 }, { comment_id: 11 }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{ affectedRows: 2 }]),
    };

    const result = await deleteCommentThread(db, 10);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WITH RECURSIVE comment_tree"),
      [10]
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM comment_reactions"),
      [10, 11]
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("DELETE FROM comments"),
      [10, 11]
    );
    expect(result).toEqual({ affectedRows: 2 });
  });
});
