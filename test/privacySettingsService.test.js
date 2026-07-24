import { jest } from "@jest/globals";

import {
  canSendDirectMessage,
  canViewUserProfile,
  DEFAULT_PRIVACY_SETTINGS,
  getUserPrivacySettings,
  normalizePrivacySettingsInput,
} from "../src/service/privacySettingsService.js";

describe("privacy settings service - phase 3 trust controls", () => {
  test("normalizes valid privacy settings values", () => {
    expect(
      normalizePrivacySettingsInput({
        profile_visibility: "FOLLOWERS",
        direct_message_permission: "everyone",
      })
    ).toEqual({
      profile_visibility: "followers",
      direct_message_permission: "everyone",
    });
  });

  test("returns defaults when privacy settings table is unavailable", async () => {
    const db = {
      query: jest.fn().mockRejectedValueOnce({
        code: "ER_NO_SUCH_TABLE",
        message: "Table 'user_privacy_settings' doesn't exist",
      }),
    };

    await expect(getUserPrivacySettings(db, 4)).resolves.toEqual(
      DEFAULT_PRIVACY_SETTINGS
    );
  });

  test("allows public profiles to be viewed without authentication", async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce([
        [
          {
            profile_visibility: "public",
            direct_message_permission: "everyone",
          },
        ],
      ]),
    };

    await expect(
      canViewUserProfile(db, {
        viewerUserId: null,
        targetUserId: 9,
      })
    ).resolves.toBe(true);
  });

  test("requires follow relationship when profile visibility is followers", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          [
            {
              profile_visibility: "followers",
              direct_message_permission: "everyone",
            },
          ],
        ])
        .mockResolvedValueOnce([[{ 1: 1 }]]),
    };

    await expect(
      canViewUserProfile(db, {
        viewerUserId: 4,
        targetUserId: 9,
      })
    ).resolves.toBe(true);
  });

  test("requires follow relationship when direct messages are followers-only", async () => {
    const db = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          [
            {
              profile_visibility: "public",
              direct_message_permission: "followers",
            },
          ],
        ])
        .mockResolvedValueOnce([[]]),
    };

    await expect(
      canSendDirectMessage(db, {
        senderUserId: 4,
        recipientUserId: 9,
      })
    ).resolves.toBe(false);
  });
});
