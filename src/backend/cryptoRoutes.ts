import express from 'express';
import type { Request, Response } from 'express';
import { CryptoService } from './services/cryptoService.ts';

const router = express.Router();
const cryptoService = new CryptoService();
router.get('/search', async (req: Request, res: Response) => {
    console.log('=== CRYPTO SEARCH API CALLED ===');

    try {
        const query = req.query.q as string;
        console.log('Search query received:', query);

        if (!query || query.trim().length < 2) {
            console.log('Invalid query - too short or empty');
            return res.status(400).json({
                success: false,
                message: 'Sökfrågan måste vara minst 2 tecken'
            });
        }

        console.log('Calling cryptoService.searchCryptos with query:', query.trim());
        const results = await cryptoService.searchCryptos(query.trim(), 20);
        console.log('CryptoService returned results count:', results.length);

        if (results.length > 0) {
            console.log('First result sample:', {
                id: results[0].id,
                symbol: results[0].symbol,
                name: results[0].name,
                hasQuote: !!results[0].quote,
                hasUSD: !!results[0].quote?.USD
            });
        }

        const mappedResults = results.map(crypto => ({
            id: crypto.id,
            symbol: crypto.symbol,
            name: crypto.name,
            current_price: crypto.quote.USD.price,
            price_change_percentage_24h: crypto.quote.USD.percent_change_24h,
            market_cap: crypto.quote.USD.market_cap,
            cmc_rank: crypto.cmc_rank
        }));

        console.log('Mapped results count:', mappedResults.length);
        console.log('=== SEARCH API SUCCESS ===');

        return res.status(200).json({
            success: true,
            data: mappedResults
        });

    } catch (error) {
        console.error('=== SEARCH CRYPTO ERROR ===');
        console.error('Error type:', typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('=== END ERROR ===');

        return res.status(500).json({
            success: false,
            message: 'Ett fel uppstod vid sökning'
        });
    }
});
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Användar-ID krävs'
            });
        }

        const userCryptos = await cryptoService.getUserCryptos(userId);

        return res.status(200).json({
            success: true,
            data: userCryptos
        });

    } catch (error) {
        console.error('Get user cryptos error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett fel uppstod när portfolio skulle hämtas'
        });
    }
});
router.post('/user/:userId/add', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { cryptoId, symbol, name } = req.body;

        if (!userId || !cryptoId || !symbol || !name) {
            return res.status(400).json({
                success: false,
                message: 'Användar-ID, crypto-ID, symbol och namn krävs'
            });
        }

        const added = await cryptoService.addCryptoToUser(userId, cryptoId, symbol, name);

        if (!added) {
            return res.status(400).json({
                success: false,
                message: 'Denna cryptocurrency finns redan i din portfolio'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Cryptocurrency tillagd till portfolio'
        });

    } catch (error) {
        console.error('Add crypto error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett fel uppstod när cryptocurrency skulle läggas till'
        });
    }
});
router.delete('/user/:userId/remove/:cryptoId', async (req: Request, res: Response) => {
    try {
        const { userId, cryptoId } = req.params;

        if (!userId || !cryptoId) {
            return res.status(400).json({
                success: false,
                message: 'Användar-ID och crypto-ID krävs'
            });
        }

        const removed = await cryptoService.removeCryptoFromUser(userId, parseInt(cryptoId));

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Cryptocurrency hittades inte i din portfolio'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cryptocurrency borttagen från portfolio'
        });

    } catch (error) {
        console.error('Remove crypto error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett fel uppstod när cryptocurrency skulle tas bort'
        });
    }
});
router.get('/listings', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const start = parseInt(req.query.start as string) || 1;

        const listings = await cryptoService.getCryptoListings(limit, start);

        return res.status(200).json({
            success: true,
            data: listings.map(crypto => ({
                id: crypto.id,
                symbol: crypto.symbol,
                name: crypto.name,
                current_price: crypto.quote.USD.price,
                price_change_percentage_24h: crypto.quote.USD.percent_change_24h,
                market_cap: crypto.quote.USD.market_cap,
                cmc_rank: crypto.cmc_rank,
                volume_24h: crypto.quote.USD.volume_24h
            }))
        });

    } catch (error) {
        console.error('Get listings error:', error);
        return res.status(500).json({
            success: false,
            message: 'Ett fel uppstod när crypto-listan skulle hämtas'
        });
    }
});

export default router;