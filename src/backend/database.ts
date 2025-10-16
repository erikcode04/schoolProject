import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';


dotenv.config({ path: '.env.local' });

class MongoDatabase {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.connect().catch(error => {
            console.error('Initial MongoDB connection failed:', error);
            console.log('Server will continue without database connection');
        });
    }

    private async connect(): Promise<void> {
        try {
            const uri = process.env.MONGODB_URI;

            if (!uri) {
                throw new Error('MONGODB_URI is not defined in environment variables');
            }

            console.log('Connecting to MongoDB...');

            const mongoOptions = {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 30000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 30000,
                maxIdleTimeMS: 300000,
                bufferMaxEntries: 0,
                retryWrites: true,
                retryReads: true
            };

            this.client = new MongoClient(uri, mongoOptions);
            await this.client.connect();

            this.db = this.client.db('skoluppgift_js2');
            this.isConnected = true;

            console.log('Successfully connected to MongoDB');

            await this.db.admin().ping();
            console.log('MongoDB ping successful');

        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            this.isConnected = false;
            this.db = null;
            this.client = null;
            console.log('Will retry connection on next database operation');
        }
    }

    public async getDb(): Promise<Db> {
        let retries = 3;
        
        while (retries > 0) {
            if (!this.isConnected || !this.db) {
                console.log(`Attempting to connect to database (${4 - retries}/3)...`);
                await this.connect();
            }

            if (this.db && this.isConnected) {
                return this.db;
            }
            
            retries--;
            if (retries > 0) {
                console.log(`Database connection failed, retrying in 2 seconds... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('Database connection not established after 3 attempts');
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
        return this.isConnected && this.db !== null;
    }

    public async testConnection(): Promise<{ connected: boolean; error?: string }> {
        try {
            if (!this.isConnected || !this.db) {
                await this.connect();
            }
            
            if (this.db && this.isConnected) {
                await this.db.admin().ping();
                return { connected: true };
            } else {
                return { connected: false, error: 'Database instance not available' };
            }
        } catch (error) {
            return { 
                connected: false, 
                error: error instanceof Error ? error.message : String(error) 
            };
        }
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