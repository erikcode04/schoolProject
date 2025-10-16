import './style.css'
import { Router } from './router.ts'
import { AuthPage } from './pages/auth.ts'
import { ItemsPage } from './pages/items.ts'
import { isAuthenticated } from './utils/auth.ts'

const router = new Router();
const authPage = new AuthPage();
const itemsPage = new ItemsPage();

console.log('App initialized');

router.addRoute('/', async () => {
    console.log('Auth route triggered');

    if (await isAuthenticated()) {
        console.log('User already authenticated, redirecting to items');
        router.navigate('/items');
        return;
    }

    const app = document.querySelector<HTMLDivElement>('#app')!;
    app.innerHTML = authPage.render();
    authPage.addEventListeners(router);
});

router.addRoute('/items', () => {
    console.log('Items route triggered');
    const app = document.querySelector<HTMLDivElement>('#app')!;
    app.innerHTML = itemsPage.render();
    itemsPage.addEventListeners(router);
});

router.init();