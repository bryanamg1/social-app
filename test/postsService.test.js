import { jest } from "@jest/globals";
import {
  savePost,
  setPinnedPost,
  unsavePost,
  updatePost,
} from "../src/service/postsService.js";

describe("posts service - phase 1 social core", () => {
  test("updatePost persists content and type before returning the refreshed row", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([
          [
            {
              post_id: 5,
              user_id: 3,
              content: "Post editado",
              post_type: "project",
              is_pinned: 0,
            },
          ],
        ]),
    };

    const result = await updatePost(db, {
      postId: 5,
      userId: 3,
      content: "Post editado",
      postType: "project",
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE posts"),
      ["Post editado", "project", 5, 3]
    );
    expect(result).toMatchObject({
      post_id: 5,
      user_id: 3,
      content: "Post editado",
      post_type: "project",
      is_pinned: 0,
    });
  });

  test("savePost returns normalized saved post ids after persisting the relation", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[{ post_id: "8" }, { post_id: 11 }]]),
    };

    const result = await savePost(db, {
      currentUserId: 4,
      postId: 8,
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT IGNORE INTO saved_posts"),
      [4, 8]
    );
    expect(result).toEqual([8, 11]);
  });

  test("unsavePost removes a saved relation for the authenticated user", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([{ affectedRows: 1 }]),
    };

    const result = await unsavePost(db, {
      currentUserId: 7,
      postId: 12,
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM saved_posts"),
      [7, 12]
    );
    expect(result).toEqual({ affectedRows: 1 });
  });

  test("setPinnedPost persists a pin and returns the refreshed post payload", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([
          [
            {
              post_id: 9,
              user_id: 2,
              content: "Pinned",
              post_type: "launch",
              is_pinned: 1,
            },
          ],
        ]),
    };

    const result = await setPinnedPost(db, {
      currentUserId: 2,
      postId: 9,
      pinned: true,
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT IGNORE INTO pinned_posts"),
      [2, 9]
    );
    expect(result).toMatchObject({
      post_id: 9,
      user_id: 2,
      post_type: "launch",
      is_pinned: 1,
    });
  });
});
