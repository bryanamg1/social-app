import {closeDB, connectDB} from '../src/config/db.js';

beforeAll(async () => {
     process.env.NODE_ENV = "test";
    await connectDB();
})
import tester from 'supertest';
import app from '../src/app.js';


afterAll( async () => {
    await closeDB();
} );

describe("Pagination Tests", () => {
    test("verify structure of pagination ", async () => {
        const res = await tester(app).get('/api/posts/allpost?page=1&limit=5');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
        expect(res.body.meta).toHaveProperty('page', 1);
        expect(res.body.meta).toHaveProperty('limit', 5);
        expect(res.body.meta).toHaveProperty('total');
    });
});
