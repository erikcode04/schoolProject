import { Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoDb from '../database.ts';
import type { User, CreateUserRequest, LoginRequest, AuthResponse } from '../models/user.ts';

export class UserService {
    private collection: Collection<User> | null = null;
    private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';

    private async getCollection(): Promise<Collection<User>> {
        if (!this.collection) {
            this.collection = await mongoDb.getCollection<User>('users');

            
            try {
                await this.collection.createIndex({ email: 1 }, { unique: true });
            } catch (error) {
                
                console.log('Email index already exists or failed to create:', error);
            }
        }
        return this.collection;
    }

    async createUser(userData: CreateUserRequest): Promise<AuthResponse> {
        try {
            const collection = await this.getCollection();

            
            const existingUser = await collection.findOne({ email: userData.email.toLowerCase() });
            if (existingUser) {
                return {
                    success: false,
                    message: 'En användare med denna e-postadress finns redan'
                };
            }

            
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            
            const newUser: Omit<User, '_id' | 'id'> = {
                fullname: userData.fullname.trim(),
                email: userData.email.toLowerCase().trim(),
                passwordHash,
                createdAt: new Date()
            };

            const result = await collection.insertOne(newUser as User);
            const createdUser = await collection.findOne({ _id: result.insertedId });

            if (!createdUser) {
                return {
                    success: false,
                    message: 'Kunde inte skapa användarkonto'
                };
            }

            
            const token = this.generateToken(createdUser);

            
            await collection.updateOne(
                { _id: createdUser._id },
                { $set: { lastLoginAt: new Date() } }
            );

            return {
                success: true,
                message: 'Användarkonto skapat framgångsrikt',
                token,
                user: {
                    id: createdUser._id!.toString(),
                    fullname: createdUser.fullname,
                    email: createdUser.email
                }
            };

        } catch (error) {
            console.error('Error creating user:', error);
            return {
                success: false,
                message: 'Ett fel uppstod när användarkontot skulle skapas'
            };
        }
    }

    async loginUser(loginData: LoginRequest): Promise<AuthResponse> {
        try {
            const collection = await this.getCollection();

            
            const user = await collection.findOne({ email: loginData.email.toLowerCase() });
            if (!user) {
                return {
                    success: false,
                    message: 'Felaktig e-postadress eller lösenord'
                };
            }

            
            const isValidPassword = await bcrypt.compare(loginData.password, user.passwordHash);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Felaktig e-postadress eller lösenord'
                };
            }

            
            const token = this.generateToken(user);

            
            await collection.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date() } }
            );

            return {
                success: true,
                message: 'Inloggning lyckades',
                token,
                user: {
                    id: user._id!.toString(),
                    fullname: user.fullname,
                    email: user.email
                }
            };

        } catch (error) {
            console.error('Error logging in user:', error);
            return {
                success: false,
                message: 'Ett fel uppstod vid inloggning'
            };
        }
    }

    async verifyToken(token: string): Promise<{ valid: boolean; userId?: string; user?: any }> {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as any;

            
            const collection = await this.getCollection();
            const user = await collection.findOne({ _id: new ObjectId(decoded.userId) });

            if (!user) {
                return { valid: false };
            }

            return {
                valid: true,
                userId: decoded.userId,
                user: {
                    id: user._id!.toString(),
                    fullname: user.fullname,
                    email: user.email
                }
            };

        } catch (error) {
            console.error('Error verifying token:', error);
            return { valid: false };
        }
    }

    async getUserById(id: string): Promise<User | null> {
        try {
            const collection = await this.getCollection();
            const user = await collection.findOne({ _id: new ObjectId(id) });

            if (!user) {
                return null;
            }

            return {
                ...user,
                id: user._id?.toString(),
                _id: undefined
            };
        } catch (error) {
            console.error('Error fetching user by id:', error);
            return null;
        }
    }

    async deleteUser(userId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const collection = await this.getCollection();
            
            
            const { CryptoService } = await import('./cryptoService.js');
            const cryptoService = new CryptoService();
            await cryptoService.deleteUserCryptos(userId);
            
            
            const result = await collection.deleteOne({ _id: new ObjectId(userId) });
            
            if (result.deletedCount === 1) {
                return {
                    success: true,
                    message: 'Användare och all tillhörande data borttagen'
                };
            } else {
                return {
                    success: false,
                    message: 'Användare kunde inte hittas'
                };
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            return {
                success: false,
                message: 'Ett fel uppstod vid borttagning av användare'
            };
        }
    }

    private generateToken(user: User): string {
        const payload = {
            userId: user._id!.toString(),
            email: user.email,
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) 
        };

        return jwt.sign(payload, this.JWT_SECRET);
    }
}