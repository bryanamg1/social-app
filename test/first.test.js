import tester from 'supertest';
import app from '../src/app.js';
import { closeDB } from '../src/config/db.js';

afterAll( async () => {
    await closeDB();
} );

describe( 'get/', () => {
    test('response servidor funcionando',async () => {
        const res = await tester(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toBe("servidor funcionando");
    });
} );