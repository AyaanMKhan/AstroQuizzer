import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';
import User from '../models/User.js';

let mongo;

// Before all tests use temporary DB 
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    await mongoose.connect(uri, {
        dbName: 'testdb',
    });
});

// Clean users between tests
beforeEach(async () => {
    await User.deleteMany({});
});

// Tear down DB after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});

describe('Auth API', () => {
    test('register success', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                username: 'JoeS',
                password: 'TEST',
                firstName: 'Joe',
                lastName: 'Shmo',
                email: 'astroquizzer@gmail.com'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.error).toBe('');
        expect(res.body.username).toBe('luna');

        // validate user actually in DB
        const userInDb = await User.findOne({ username: 'JoeS' });
        expect(userInDb).not.toBeNull();
        expect(userInDb.passwordHash).toBeDefined();
    });

    test('register fails when a field is missing', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                username: 'JoeS',
                // missing password
                firstName: 'Joe',
                lastName: 'Shmo',
                email: 'joeshmo@gmail.com'
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('All fields required');
    });

    test('register fails on duplicate username', async () => {
        // First register – succeeds
        const res1 = await request(app)
            .post('/api/register')
            .send({
                username: 'JoeS',
                password: 'TEST',
                firstName: 'Joe',
                lastName: 'Shmo',
                email: 'astroquizzer@gmail.com'
            });
        expect(res1.statusCode).toBe(200);
        expect(res1.body.error).toBe('');

        // Second register with same username – fails
        const res2 = await request(app)
            .post('/api/register')
            .send({
                username: 'JoeS',
                password: 'TEST2',
                firstName: 'Other',
                lastName: 'User',
                email: 'astroquizzer@gmail.com'
            });

        expect(res2.statusCode).toBe(400);
        expect(res2.body.error).toBe('Username already in use');
    });

    test('login success returns jwtToken', async () => {
        // Register first
        const regRes = await request(app)
            .post('/api/register')
            .send({
                username: 'JoeS',
                password: 'TEST',
                firstName: 'Joe',
                lastName: 'Shmo',
                email: 'astroquizzer@gmail.com'
            });
        expect(regRes.statusCode).toBe(200);
        expect(regRes.body.error).toBe('');

        // Now login
        const loginRes = await request(app)
            .post('/api/login')
            .send({
                username: 'JoeS',
                password: 'TEST'
            });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.error).toBe('');
        expect(typeof loginRes.body.jwtToken).toBe('string');
        expect(loginRes.body.jwtToken.length).toBeGreaterThan(10);
    });

    test('login fails with wrong password', async () => {
        // Register once
        await request(app).post('/api/register').send({
            username: 'JoeS',
            password: 'TEST',
            firstName: 'Joe',
            lastName: 'Shmo',
            email: 'astroquizzer@gmail.com'
        });

        // Wrong password
        const res = await request(app)
            .post('/api/login')
            .send({
                username: 'JoeS',
                password: 'WrongPassword'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.error).toBe('Incorrect username or password');
        expect(res.body.jwtToken).toBe('');
    });

    test('login fails when password missing', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                username: 'JoeS'
                // no password
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Missing username or password');
    });
});