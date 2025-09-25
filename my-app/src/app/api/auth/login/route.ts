import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
    const db = new Database();
    try {
        await db.initialize();
        const body = await request.json();
        const validatedData = loginSchema.parse(body);

        // Check if user exists
        const user = await db.findUserByEmail(validatedData.email);
        
        // Check if password is correct
        const validPassword = await AuthService.verifyPassword(validatedData.password, user!.password_hash);
        if (!user || !validPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Generate JWT token for session
        const token = AuthService.generateToken(user!);

        // Return success response (don't include password hash!)
        return NextResponse.json(
            {
                message: 'Login successful',
                user: {
                    id: user!.id,
                    email: user!.email,
                    created_at: user!.created_at,
                },
                token,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        // Handle validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
            { error: 'Invalid input', details: error },
            { status: 400 }
            );
        }
    
        // Handle other errors
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await db.close();
    }
};