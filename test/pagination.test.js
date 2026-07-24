import {closeDB, connectDB, getDB} from '../src/config/db.js';

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await connectDB();
    const db = getDB();

    await db.query(`
        CREATE TABLE IF NOT EXISTS pinned_posts (
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS saved_posts (
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        )
    `);
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
    }, 15000);
});
