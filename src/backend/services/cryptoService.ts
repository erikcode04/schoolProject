import MongoDatabase from '../database.ts';
import { ObjectId } from 'mongodb';

interface CoinMarketCapResponse {
    data: CryptoData[];
    status: {
        timestamp: string;
        error_code: number;
        error_message: string;
        elapsed: number;
        credit_count: number;
    };
}

interface CryptoData {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    cmc_rank: number;
    num_market_pairs: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
    infinite_supply: boolean;
    last_updated: string;
    date_added: string;
    tags: string[];
    platform: any;
    self_reported_circulating_supply: number | null;
    self_reported_market_cap: number | null;
    quote: {
        USD: {
            price: number;
            volume_24h: number;
            volume_change_24h: number;
            percent_change_1h: number;
            percent_change_24h: number;
            percent_change_7d: number;
            market_cap: number;
            market_cap_dominance: number;
            fully_diluted_market_cap: number;
            last_updated: string;
        };
    };
}

interface UserCrypto {
    _id?: ObjectId;
    userId: string;
    cryptoId: number;
    symbol: string;
    name: string;
    addedAt: Date;
}

export class CryptoService {
    private database: typeof MongoDatabase;
    private CMC_API_KEY: string;
    private CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

    constructor() {
        this.database = MongoDatabase;
        this.CMC_API_KEY = process.env.COINMARKETCAP_API_KEY || '';

        if (!this.CMC_API_KEY) {
            console.warn('Warning: COINMARKETCAP_API_KEY not found in environment variables');
        }
    }

    async getCryptoListings(limit: number = 100, start: number = 1): Promise<CryptoData[]> {
        console.log('=== GET CRYPTO LISTINGS CALLED ===');
        console.log('Limit:', limit, 'Start:', start);

        if (!this.CMC_API_KEY) {
            console.error('CoinMarketCap API key not configured');
            throw new Error('CoinMarketCap API key not configured');
        }

        const url = `${this.CMC_BASE_URL}/cryptocurrency/listings/latest?start=${start}&limit=${limit}&convert=USD`;
        console.log('API URL:', url);

        try {
            console.log('Making request to CoinMarketCap...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CMC_PRO_API_KEY': this.CMC_API_KEY,
                    'Accept': 'application/json',
                    'Accept-Encoding': 'deflate, gzip'
                }
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('CoinMarketCap API Error Response:', errorText);
                throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
            }

            console.log('Parsing JSON response...');
            const data: CoinMarketCapResponse = await response.json();
            console.log('Response status code from CMC:', data.status.error_code);

            if (data.status.error_code !== 0) {
                console.error('CoinMarketCap API returned error:', data.status.error_message);
                throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
            }

            console.log('Successfully fetched', data.data.length, 'crypto entries');
            return data.data;
        } catch (error) {
            console.error('=== GET CRYPTO LISTINGS ERROR ===');
            console.error('Error type:', typeof error);
            console.error('Error message:', error instanceof Error ? error.message : String(error));
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('=== END LISTINGS ERROR ===');
            throw error;
        }
    }

    async searchCryptos(query: string, limit: number = 20): Promise<CryptoData[]> {
        console.log('=== CRYPTO SERVICE SEARCH CALLED ===');
        console.log('Query:', query, 'Limit:', limit);

        try {
            console.log('Fetching crypto listings...');
            const listings = await this.getCryptoListings(1000);
            console.log('Fetched listings count:', listings.length);

            const searchTerm = query.toLowerCase();
            console.log('Searching for term:', searchTerm);

            const filtered = listings.filter(crypto => {
                const nameMatch = crypto.name.toLowerCase().includes(searchTerm);
                const symbolMatch = crypto.symbol.toLowerCase().includes(searchTerm);
                return nameMatch || symbolMatch;
            });

            console.log('Filtered results count:', filtered.length);

            const results = filtered.slice(0, limit);
            console.log('Final results count (after limit):', results.length);

            if (results.length > 0) {
                console.log('Sample result:', {
                    name: results[0].name,
                    symbol: results[0].symbol,
                    id: results[0].id
                });
            }

            return results;
        } catch (error) {
            console.error('=== CRYPTO SERVICE SEARCH ERROR ===');
            console.error('Error type:', typeof error);
            console.error('Error message:', error instanceof Error ? error.message : String(error));
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('=== END SERVICE ERROR ===');
            throw error;
        }
    }

    async getCryptosByIds(ids: number[]): Promise<CryptoData[]> {
        if (!this.CMC_API_KEY) {
            throw new Error('CoinMarketCap API key not configured');
        }

        const idsString = ids.join(',');
        const url = `${this.CMC_BASE_URL}/cryptocurrency/quotes/latest?id=${idsString}&convert=USD`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-CMC_PRO_API_KEY': this.CMC_API_KEY,
                    'Accept': 'application/json',
                    'Accept-Encoding': 'deflate, gzip'
                }
            });

            if (!response.ok) {
                throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status.error_code !== 0) {
                throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
            }


            return Object.values(data.data) as CryptoData[];
        } catch (error) {
            console.error('Error fetching crypto by IDs:', error);
            throw error;
        }
    }

    async addCryptoToUser(userId: string, cryptoId: number, symbol: string, name: string): Promise<boolean> {
        try {
            const collection = await this.database.getCollection<UserCrypto>('user_cryptos');


            const existing = await collection.findOne({ userId, cryptoId });
            if (existing) {
                return false;
            }

            const userCrypto: Omit<UserCrypto, '_id'> = {
                userId,
                cryptoId,
                symbol: symbol.toUpperCase(),
                name,
                addedAt: new Date()
            };

            const result = await collection.insertOne(userCrypto);
            return result.acknowledged;
        } catch (error) {
            console.error('Error adding crypto to user:', error);
            throw error;
        }
    }

    async removeCryptoFromUser(userId: string, cryptoId: number): Promise<boolean> {
        try {
            const collection = await this.database.getCollection<UserCrypto>('user_cryptos');
            const result = await collection.deleteOne({ userId, cryptoId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error removing crypto from user:', error);
            throw error;
        }
    }

    async getUserCryptos(userId: string): Promise<any[]> {
        try {
            const collection = await this.database.getCollection<UserCrypto>('user_cryptos');
            const userCryptos = await collection.find({ userId }).toArray();

            if (userCryptos.length === 0) {
                return [];
            }


            const cryptoIds = userCryptos.map(uc => uc.cryptoId);
            const cryptoData = await this.getCryptosByIds(cryptoIds);


            return userCryptos.map(userCrypto => {
                const priceData = cryptoData.find(cd => cd.id === userCrypto.cryptoId);

                return {
                    id: priceData?.id || userCrypto.cryptoId,
                    symbol: userCrypto.symbol,
                    name: userCrypto.name,
                    addedAt: userCrypto.addedAt,
                    current_price: priceData?.quote.USD.price,
                    price_change_percentage_24h: priceData?.quote.USD.percent_change_24h,
                    market_cap: priceData?.quote.USD.market_cap,
                    volume_24h: priceData?.quote.USD.volume_24h,
                    cmc_rank: priceData?.cmc_rank,
                    last_updated: priceData?.quote.USD.last_updated
                };
            });
        } catch (error) {
            console.error('Error getting user cryptos:', error);
            throw error;
        }
    }

    async deleteUserCryptos(userId: string): Promise<boolean> {
        try {
            const collection = await this.database.getCollection<UserCrypto>('user_cryptos');

            const result = await collection.deleteMany({ userId });

            console.log(`Deleted ${result.deletedCount} crypto entries for user ${userId}`);
            return true;
        } catch (error) {
            console.error('Error deleting user cryptos:', error);
            return false;
        }
    }
}