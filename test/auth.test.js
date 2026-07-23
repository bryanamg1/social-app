import tester from "supertest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { closeDB, connectDB } from "../src/config/db.js";

const TEST_SECRET = process.env.JWT_SECRET || "testsecretkey";

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = TEST_SECRET;
    await connectDB();
});

afterAll(async () => {
    await closeDB();
});

const createAuthToken = (payload = { user_id: 4 }) => {
    return jwt.sign(payload, TEST_SECRET, { expiresIn: "10m" });
};

describe("Authentication middleware", () => {
    test("returns 401 when token is missing", async () => {
        const res = await tester(app).get("/api/follows/users/2/status");

        expect(res.status).toBe(401);
    });

    test("returns 401 when token is invalid", async () => {
        const res = await tester(app)
            .get("/api/follows/users/2/status")
            .set("Authorization", "Bearer invalidtoken");

        expect(res.status).toBe(401);
    });

    test("allows access with a valid token", async () => {
        const token = createAuthToken();

        const res = await tester(app)
            .get("/api/follows/users/2/status")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ok", true);
        expect(res.body).toHaveProperty("data");
    });

    test("profile route returns the requested user profile, not the authenticated user profile", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .get("/api/auth/users/2")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ok", true);
        expect(res.body.data).toHaveProperty("user_id", 2);
    });

    test("my profile route returns the authenticated user profile", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .get("/api/auth/me/profile")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ok", true);
        expect(res.body.data).toHaveProperty("user_id", 4);
    });

    test("rejects creating a post for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .post("/api/posts/CreatePost/2")
            .set("Authorization", `Bearer ${token}`)
            .send({ content: "post test", post_type: "project" });

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("rejects commenting for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .post("/api/comments/addComment/2/1")
            .set("Authorization", `Bearer ${token}`)
            .send({ comment_text: "comentario test" });

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("rejects reacting for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .post("/api/reactions/toggleReaction/2/1")
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "LIKE" });

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("rejects avatar updates for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .post("/api/image/uploadImage/2")
            .set("Authorization", `Bearer ${token}`)
            .send({ image_url: "https://images.example.com/avatar.png" });

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("rejects legacy profile updates for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .patch("/api/auth/update/2")
            .set("Authorization", `Bearer ${token}`)
            .send({ bio: "bio test" });

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("rejects reading my reaction for a different authenticated user", async () => {
        const token = createAuthToken({ user_id: 4 });

        const res = await tester(app)
            .get("/api/reactions/2/1/byUserInPost")
            .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });
});

describe("Rate limit login", () => {
    test("blocks after max attempts", async () => {
        for (let i = 0; i < 11; i++) {
            await tester(app)
                .post("/api/auth/login")
                .send({ email: "bryan@examplee.com", password: "123456" });
        }

        const res = await tester(app)
            .post("/api/auth/login")
            .send({ email: "bryan@examplee.com", password: "123456" });

        expect(res.status).toBe(429);
        expect(res.body.ok).toBe(false);
        expect(res.body.error.code).toBe("LOGIN_RATE_LIMIT_EXCEEDED");
    }, 15000);
});
