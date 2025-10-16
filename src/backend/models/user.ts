import { ObjectId } from 'mongodb';

export interface User {
    _id?: ObjectId;
    id?: string;
    fullname: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt?: Date;
    lastLoginAt?: Date;
}

export interface CreateUserRequest {
    fullname: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: string;
        fullname: string;
        email: string;
    };
}