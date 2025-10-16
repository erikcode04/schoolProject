export class HomePage {
    render(): string {
        return `
      <div class="page">
        <h1>Hem</h1>
        <p>Välkommen till vår fullstack applikation!</p>
        <div class="card">
          <p>Detta är en SPA (Single Page Application) byggd med:</p>
          <ul>
            <li>Vite + TypeScript</li>
            <li>Express.js backend</li>
            <li>Client-side routing</li>
            <li>MongoDB för datalagring</li>
          </ul>
        </div>
        <div class="navigation">
          <button id="nav-items" class="nav-button">Hantera Items</button>
        </div>
      </div>
    `;
    }

    addEventListeners(router: any) {
        const navItemsBtn = document.getElementById('nav-items');
        if (navItemsBtn) {
            navItemsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                router.navigate('/items');
            });
        }
    }
}

console.log('HomePage module loaded');