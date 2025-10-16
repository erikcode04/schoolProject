import { Collection, ObjectId } from 'mongodb';
import mongoDb from '../database.ts';
import type { Item, CreateItemRequest, UpdateItemRequest } from '../models/item.ts';

export class ItemService {
    private collection: Collection<Item> | null = null;

    private async getCollection(): Promise<Collection<Item>> {
        if (!this.collection) {
            this.collection = await mongoDb.getCollection<Item>('items');
        }
        return this.collection;
    }

    async getAllItems(): Promise<Item[]> {
        try {
            const collection = await this.getCollection();
            const items = await collection.find({}).toArray();

            
            return items.map(item => ({
                ...item,
                id: item._id?.toString(),
                _id: undefined
            }));
        } catch (error) {
            console.error('Error fetching items:', error);
            throw new Error('Failed to fetch items');
        }
    }

    async createItem(data: CreateItemRequest): Promise<Item> {
        try {
            const collection = await this.getCollection();
            const newItem: Omit<Item, '_id' | 'id'> = {
                name: data.name,
                description: data.description,
                createdAt: new Date()
            };

            const result = await collection.insertOne(newItem as Item);

            const createdItem = await collection.findOne({ _id: result.insertedId });
            if (!createdItem) {
                throw new Error('Failed to retrieve created item');
            }

            return {
                ...createdItem,
                id: createdItem._id?.toString(),
                _id: undefined
            };
        } catch (error) {
            console.error('Error creating item:', error);
            throw new Error('Failed to create item');
        }
    }

    async updateItem(id: string, data: UpdateItemRequest): Promise<Item | null> {
        try {
            const collection = await this.getCollection();
            const objectId = new ObjectId(id);

            const updateData = {
                ...data,
                updatedAt: new Date()
            };

            const result = await collection.findOneAndUpdate(
                { _id: objectId },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!result) {
                return null;
            }

            return {
                ...result,
                id: result._id?.toString(),
                _id: undefined
            };
        } catch (error) {
            console.error('Error updating item:', error);
            throw new Error('Failed to update item');
        }
    }

    async deleteItem(id: string): Promise<boolean> {
        try {
            const collection = await this.getCollection();
            const objectId = new ObjectId(id);

            const result = await collection.deleteOne({ _id: objectId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw new Error('Failed to delete item');
        }
    }

    async getItemById(id: string): Promise<Item | null> {
        try {
            const collection = await this.getCollection();
            const objectId = new ObjectId(id);

            const item = await collection.findOne({ _id: objectId });
            if (!item) {
                return null;
            }

            return {
                ...item,
                id: item._id?.toString(),
                _id: undefined
            };
        } catch (error) {
            console.error('Error fetching item by id:', error);
            throw new Error('Failed to fetch item');
        }
    }
}