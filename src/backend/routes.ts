import type { Request, Response } from 'express';
import express from 'express';
import { ItemService } from './services/itemService.ts';
import mongoDb from './database.ts';

const router = express.Router();
const itemService = new ItemService();


router.get('/health', async (req: Request, res: Response) => {
    try {
        const isConnected = mongoDb.isDbConnected();
        res.json({
            status: 'ok',
            database: isConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
});


router.get('/items', async (req: Request, res: Response) => {
    try {
        const items = await itemService.getAllItems();
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});


router.post('/items', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }

        const newItem = await itemService.createItem({ name, description });
        return res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});


router.put('/items/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const updatedItem = await itemService.updateItem(id, { name, description });
        if (!updatedItem) {
            return res.status(404).json({ error: 'Item not found' });
        }

        return res.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});


router.delete('/items/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deleted = await itemService.deleteItem(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Item not found' });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export default router;