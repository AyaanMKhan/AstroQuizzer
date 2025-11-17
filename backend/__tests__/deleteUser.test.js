// __tests__/deleteUser.test.js

import request from 'supertest';
import app from '../server.js';
import { createToken } from '../createJWT.js';

// Mock the User model
jest.mock('../models/User.js', () => ({
    __esModule: true,
    default: {
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    },
}));

const User = (await import('../models/User.js')).default;

describe('DELETE /api/deleteUser', () => {
    // any valid 24-char hex string
    const userId = '665f1d94f8f8b9a5c1234567';

    test('should delete the user when JWT is valid and id matches', async () => {
        // Creates a real JWT
        const { accessToken } = createToken({
            userId,
            username: 'tester',
            firstName: 'Test',
            lastName: 'User',
        });

        // Call the endpoint
        const res = await request(app)
            .post('/api/deleteUser')
            .send({ id: userId, jwtToken: accessToken });

        // Expectations
        expect(res.statusCode).toBe(200);
        expect(res.body.error).toBe('');
        expect(res.body.jwtToken).toBe('');

        // Check the right user deleted in Mongo
        expect(User.deleteOne).toHaveBeenCalledWith({
            _id: expect.any(Object),
        });
    });

    test('should reject deletion if id and token userId do not match', async () => {
        const { accessToken } = createToken({
            userId,
            username: 'tester',
            firstName: 'Test',
            lastName: 'User',
        });

        const res = await request(app)
            .post('/api/deleteUser')
            .send({ id: '000000000000000000000000', jwtToken: accessToken });

        expect(res.statusCode).toBe(200);
        expect(res.body.error).toBe('Not authorized to delete this user');
        expect(User.deleteOne).not.toHaveBeenCalled();
    });

    test('should complain if JWT is missing', async () => {
        const res = await request(app)
            .post('/api/deleteUser')
            .send({ id: userId });

        expect(res.statusCode).toBe(200);
        expect(res.body.error).toBe('Missing JWT');
    });
});