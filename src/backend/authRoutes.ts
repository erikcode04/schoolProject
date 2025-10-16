import type { Request, Response } from 'express';
import express from 'express';
import { UserService } from './services/userService.ts';

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

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-post och lösenord krävs'
            });
        }

        const result = await userService.loginUser({ email, password });

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

export default router;