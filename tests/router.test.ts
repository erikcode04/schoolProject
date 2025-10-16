import { describe, it, expect } from 'vitest';
import { Router } from '../src/frontend/router.ts';

describe('Router', () => {
    it('should create a router instance', () => {
        const router = new Router();
        expect(router).toBeDefined();
        expect(router.getCurrentRoute()).toBe('/');
    });

    it('should add and navigate to routes', () => {
        const router = new Router();
        let currentPage = '';

        router.addRoute('/test', () => {
            currentPage = 'test';
        });

        router.navigate('/test');
        expect(router.getCurrentRoute()).toBe('/test');
    });

    it('should handle navigation without page reload', () => {
        const router = new Router();
        const initialLocation = window.location.pathname;

        router.addRoute('/about', () => {
            // Route handler
        });

        router.navigate('/about');
        expect(router.getCurrentRoute()).toBe('/about');

        // Reset
        router.navigate(initialLocation);
    });
});