import { jest } from "@jest/globals";

const verifyIdToken = jest.fn();

jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken(options) {
      return verifyIdToken(options);
    }
  },
}));

const {
  buildGoogleAuthColumnsSql,
  getMissingGoogleAuthEnvVars,
  isGoogleAuthConfigured,
  resolveGoogleAuthUser,
  verifyGoogleCredential,
} = await import("../src/service/googleAuthService.js");

describe("google auth service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_CLIENT_ID;
    verifyIdToken.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("requires GOOGLE_CLIENT_ID to enable google auth", () => {
    expect(getMissingGoogleAuthEnvVars()).toEqual(["GOOGLE_CLIENT_ID"]);
    expect(isGoogleAuthConfigured()).toBe(false);
  });

  test("verifies the id token using GOOGLE_CLIENT_ID", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-sub",
        email: "USER@example.com",
        email_verified: true,
        name: "Bryan Marquez",
        given_name: "Bryan",
        family_name: "Marquez",
        picture: "https://images.example.com/avatar.png",
      }),
    });

    await expect(verifyGoogleCredential("google-id-token")).resolves.toEqual({
      googleSub: "google-sub",
      email: "user@example.com",
      emailVerified: true,
      name: "Bryan Marquez",
      givenName: "Bryan",
      familyName: "Marquez",
      picture: "https://images.example.com/avatar.png",
    });

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: "google-client-id",
    });
  });

  test("rejects google accounts with unverified email", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-sub",
        email: "user@example.com",
        email_verified: false,
      }),
    });

    await expect(verifyGoogleCredential("google-id-token")).rejects.toMatchObject(
      {
        code: "GOOGLE_AUTH_EMAIL_NOT_VERIFIED",
        status: 403,
      }
    );
  });

  test("creates a new user when google_sub and email do not exist", async () => {
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 8 }])
        .mockResolvedValueOnce([
          [
            {
              user_id: 8,
              user_name: "bryan_marquez",
              email: "user@example.com",
              avatar_url: "https://images.example.com/avatar.png",
              google_sub: "google-sub",
              auth_provider: "google",
              email_verified: 1,
            },
          ],
        ]),
    };

    const result = await resolveGoogleAuthUser(db, {
      googleSub: "google-sub",
      email: "user@example.com",
      emailVerified: true,
      name: "Bryan Marquez",
      givenName: "Bryan",
      picture: "https://images.example.com/avatar.png",
    });

    expect(result).toEqual({
      action: "created_user",
      user: expect.objectContaining({
        user_id: 8,
        email: "user@example.com",
        google_sub: "google-sub",
      }),
    });
  });

  test("links an existing local user by verified email", async () => {
    const existingUser = {
      user_id: 14,
      user_name: "bryan_amg1",
      email: "user@example.com",
      avatar_url: null,
      google_sub: null,
      auth_provider: "local",
      email_verified: 0,
    };
    const linkedUser = {
      ...existingUser,
      avatar_url: "https://images.example.com/avatar.png",
      google_sub: "google-sub",
      auth_provider: "google",
      email_verified: 1,
    };
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[existingUser]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[linkedUser]]),
    };

    const result = await resolveGoogleAuthUser(db, {
      googleSub: "google-sub",
      email: "user@example.com",
      emailVerified: true,
      name: "Bryan Marquez",
      givenName: "Bryan",
      picture: "https://images.example.com/avatar.png",
    });

    expect(result).toEqual({
      action: "linked_existing_user",
      user: linkedUser,
    });
  });

  test("returns the existing google-linked user", async () => {
    const existingGoogleUser = {
      user_id: 21,
      user_name: "bryan_google",
      email: "user@example.com",
      avatar_url: "",
      google_sub: "google-sub",
      auth_provider: "google",
      email_verified: 1,
    };
    const refreshedGoogleUser = {
      ...existingGoogleUser,
      avatar_url: "https://images.example.com/avatar.png",
    };
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce([[existingGoogleUser]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[refreshedGoogleUser]]),
    };

    const result = await resolveGoogleAuthUser(db, {
      googleSub: "google-sub",
      email: "user@example.com",
      emailVerified: true,
      name: "Bryan Marquez",
      givenName: "Bryan",
      picture: "https://images.example.com/avatar.png",
    });

    expect(result).toEqual({
      action: "existing_google_user",
      user: refreshedGoogleUser,
    });
  });

  test("provides the manual SQL required by the feature", () => {
    expect(buildGoogleAuthColumnsSql()).toContain("ADD COLUMN google_sub");
    expect(buildGoogleAuthColumnsSql()).toContain("ADD COLUMN auth_provider");
    expect(buildGoogleAuthColumnsSql()).toContain("ADD COLUMN email_verified");
  });
});
