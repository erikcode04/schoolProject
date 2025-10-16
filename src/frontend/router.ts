export class Router {
    private routes: Map<string, () => void | Promise<void>> = new Map();
    private currentRoute: string = '/';
    private initialized: boolean = false;

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        window.addEventListener('popstate', async () => {
            await this.handleRoute(window.location.pathname);
        });
    }

    public async init() {
        if (!this.initialized) {
            this.initialized = true;
            const currentPath = window.location.pathname;
            this.currentRoute = currentPath;
            console.log('Router initializing with current path:', currentPath);
            await this.handleRoute(currentPath);
        }
    }

    public addRoute(path: string, handler: () => void | Promise<void>) {
        console.log('Adding route:', path);
        this.routes.set(path, handler);
    }

    public async navigate(path: string) {
        console.log('Navigating to:', path, 'Current route:', this.currentRoute);
        if (path !== this.currentRoute) {
            this.currentRoute = path;
            window.history.pushState({}, '', path);
            await this.handleRoute(path);
        } else {
            console.log('Already on route:', path, 'skipping navigation');
        }
    }

    private async handleRoute(path: string) {
        console.log('Handling route:', path, 'Available routes:', Array.from(this.routes.keys()));
        const handler = this.routes.get(path);
        if (handler) {
            console.log('Found handler for:', path);
            await handler();
        } else {
            console.log('No handler found for:', path, 'falling back to home');
            const homeHandler = this.routes.get('/');
            if (homeHandler) {
                await homeHandler();
            }
        }
    } public getCurrentRoute(): string {
        return this.currentRoute;
    }
}