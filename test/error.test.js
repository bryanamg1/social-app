import tester from "supertest";
import app from "../src/app.js";

describe(" test errorHandler", () => {
    test("return 404 error", async () => {
        const res = await tester(app).get("/route_does_not_exist");
        expect(res.status).toBe(404);

    });
});