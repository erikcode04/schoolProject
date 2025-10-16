import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import routes from './src/backend/routes.ts';
import authRoutes from './src/backend/authRoutes.ts';
import cryptoRoutes from './src/backend/cryptoRoutes.ts';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json());

    app.use('/api', routes);
    app.use('/api/auth', authRoutes);
    app.use('/api/crypto', cryptoRoutes);

    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
            root: process.cwd(),
        });

        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(__dirname, 'dist')));

        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.join(__dirname, 'dist', 'index.html'));
            }
        });
    }

    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

createServer().catch(console.error);