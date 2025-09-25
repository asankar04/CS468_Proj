import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for registration
const registerSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  const db = new Database();
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Initialize database
    await db.initialize();

    // Check if user already exists
    const existingUser = await db.findUserByEmail(validatedData.email);
    if (existingUser) {
        return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 400 }
        );
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(validatedData.password);

    // Create user in database
    const user = await db.createUser(validatedData.email, hashedPassword);

    // Generate JWT token
    const token = AuthService.generateToken(user);

    // Return success response
    return NextResponse.json(
        {
            message: 'User registered successfully',
            user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            },
            token,
        },
        { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

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
