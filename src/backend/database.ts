import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';


dotenv.config({ path: '.env.local' });

class MongoDatabase {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.connect();
    }

    private async connect(): Promise<void> {
        try {
            const uri = process.env.MONGODB_URI;

            if (!uri) {
                throw new Error('MONGODB_URI is not defined in environment variables');
            }

            console.log('Connecting to MongoDB...');
            this.client = new MongoClient(uri);
            await this.client.connect();

            
            this.db = this.client.db('skoluppgift_js2');
            this.isConnected = true;

            console.log('Successfully connected to MongoDB');

            
            await this.db.admin().ping();
            console.log('MongoDB ping successful');

        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            this.isConnected = false;
            throw error;
        }
    }

    public async getDb(): Promise<Db> {
        if (!this.isConnected || !this.db) {
            await this.connect();
        }

        if (!this.db) {
            throw new Error('Database connection not established');
        }

        return this.db;
    }

    public async getCollection<T extends Record<string, any> = any>(collectionName: string): Promise<Collection<T>> {
        const db = await this.getDb();
        return db.collection<T>(collectionName);
    }

    public async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('MongoDB connection closed');
        }
    }

    public isDbConnected(): boolean {
        return this.isConnected;
    }

    
    public setupGracefulShutdown(): void {
        const shutdown = async () => {
            console.log('Shutting down MongoDB connection...');
            await this.close();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('SIGUSR2', shutdown); 
    }
}


const mongoDb = new MongoDatabase();


mongoDb.setupGracefulShutdown();

export default mongoDb;