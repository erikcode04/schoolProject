import type { Request, Response } from 'express';
import express from 'express';
import { UserService } from './services/userService.ts';
import mongoDb from './database.ts';

const router = express.Router();
const userService = new UserService();
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { fullname, email, password } = req.body;


        if (!fullname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Alla fält måste fyllas i'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Lösenordet måste vara minst 6 tecken'
            });
        }

        const result = await userService.createUser({ fullname, email, password });

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett serverfel uppstod'
        });
    }
});
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({
                success: false,
                message: 'E-post och lösenord krävs'
            });
        }

        console.log('Calling userService.loginUser...');
        const result = await userService.loginUser({ email, password });
        console.log('Login result:', { success: result.success, message: result.message });

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(401).json(result);
        }

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett serverfel uppstod'
        });
    }
});
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token krävs'
            });
        }

        const result = await userService.verifyToken(token);

        if (result.valid) {
            return res.status(200).json({
                success: true,
                user: result.user
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Ogiltigt token'
            });
        }

    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett serverfel uppstod'
        });
    }
});
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Token krävs'
            });
        }

        const result = await userService.verifyToken(token);

        if (result.valid && result.user) {
            return res.status(200).json({
                user: result.user
            });
        } else {
            return res.status(401).json({
                message: 'Ogiltigt token'
            });
        }

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            message: 'Ett serverfel uppstod'
        });
    }
});
router.delete('/delete-account', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token saknas'
            });
        }

        const result = await userService.verifyToken(token);

        if (!result.valid || !result.user) {
            return res.status(401).json({
                success: false,
                message: 'Ogiltigt token'
            });
        }


        const deleteResult = await userService.deleteUser(result.user.id);

        if (deleteResult.success) {
            return res.status(200).json({
                success: true,
                message: 'Konto borttaget'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Kunde inte ta bort konto'
            });
        }

    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett serverfel uppstod'
        });
    }
});

router.get('/debug/db', async (req: Request, res: Response) => {
    try {
        console.log('Debug: Testing database connection...');
        
        const connectionTest = await mongoDb.testConnection();
        
        if (!connectionTest.connected) {
            return res.status(500).json({
                success: false,
                message: 'Database connection failed',
                connectionTest,
                userCount: 0
            });
        }
        
        const userCount = await userService.getUserCount();
        console.log('Debug: User count in database:', userCount);
        
        return res.status(200).json({
            success: true,
            message: 'Database connection working',
            connectionTest,
            userCount: userCount
        });
    } catch (error) {
        console.error('Debug: Database test failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});export default router;