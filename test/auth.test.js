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