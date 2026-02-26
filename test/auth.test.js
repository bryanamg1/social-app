import {closeDB, connectDB} from '../src/config/db.js';
import jwt from "jsonwebtoken";


beforeAll(async () => {
    process.env.NODE_ENV = "test"; // base de testing
    process.env.JWT_SECRET = "testsecretkey"; // firma de testing
    await connectDB();
})
import tester from 'supertest';
import app from '../src/app.js';


afterAll( async () => {
    await closeDB();
} );
describe("Authentication Tests", () => {
    test ("no hay token",async () => {
        const res = await tester(app).post("/api/follows/users/1/follow");
        expect(res.status).toBe(401);

    });
});

describe("invalid token Tests", () => {
    test ("no hay token",async () => {
        const res = await tester(app)
        .post("/api/follows/users/1/follow")
        .set("bearer","invalidtoken");
        expect(res.status).toBe(401);
        
    });
});

describe("valid token Tests", () => {
    const token = jwt.sign({ user_id: 4 }, process.env.JWT_SECRET, {expiresIn:"10m"});
    test("token valido",async () => {
        const res = await tester(app).post("/api/follows/users/2/follow")
        .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(201);
    });
});

describe("valid token Tests", () => {
    const token = jwt.sign({ user_id: 4 }, process.env.JWT_SECRET, {expiresIn:"10m"});
    test("token valido",async () => {
        const res = await tester(app).post("/api/follows/users/2/unfollow")
        .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});


describe("Rate Limit Login", () => {

    test("should block after max attempts", async () => {

        for (let i = 0; i < 9; i++) {
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
    });
});