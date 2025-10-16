import { requireAuth, logout, getAuthState } from '../utils/auth.ts';

interface Crypto {
  id: number;
  symbol: string;
  name: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  volume_24h?: number;
  cmc_rank?: number;
  last_updated?: string;
  addedAt?: string;
}

interface SearchResult {
  id: number;
  symbol: string;
  name: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  cmc_rank?: number;
}

export class ItemsPage {
  private userCryptos: Crypto[] = [];
  private searchResults: SearchResult[] = [];
  private isSearching: boolean = false; render(): string {
    return `
      <div class="page">
        <h1>Crypto Portfolio</h1>
        
        <div class="navigation">
          <button id="nav-logout" class="nav-button logout-btn">Logga ut</button>
          <button id="delete-account" class="nav-button delete-account-btn">Ta bort konto</button>
        </div>

        <div class="search-container">
          <h2>Lägg till Cryptocurrency</h2>
          <div class="search-section">
            <div class="search-input-container">
              <input 
                type="text" 
                id="crypto-search" 
                placeholder="Sök efter cryptocurrency (t.ex. Bitcoin, BTC)" 
                autocomplete="off"
              >
              <button id="search-btn" class="search-button">Sök</button>
            </div>
            
            <div id="search-results" class="search-results">
              ${this.renderSearchResults()}
            </div>
          </div>
        </div>

        <div class="portfolio-container">
          <h2>Min Crypto Portfolio</h2>
          <div id="crypto-list" class="crypto-list">
            ${this.renderCryptoList()}
          </div>
        </div>
      </div>
    `;
  }

  private renderSearchResults(): string {
    if (this.isSearching) {
      return '<div class="loading">Söker...</div>';
    }

    if (this.searchResults.length === 0) {
      return '<div class="no-results">Sök efter cryptocurrency för att lägga till i din portfolio</div>';
    }

    return this.searchResults.map(crypto => `
      <div class="search-result-item" data-id="${crypto.id}">
        <div class="crypto-info">
          <span class="crypto-symbol">${crypto.symbol.toUpperCase()}</span>
          <span class="crypto-name">${crypto.name}</span>
        </div>
        <button class="add-crypto-btn" data-id="${crypto.id}" data-symbol="${crypto.symbol}" data-name="${crypto.name}">
          Lägg till
        </button>
      </div>
    `).join('');
  }

  private renderCryptoList(): string {
    if (this.userCryptos.length === 0) {
      return `
        <div class="empty-portfolio">
          <p>Din portfolio är tom</p>
          <p>Använd sökfunktionen ovan för att lägga till cryptocurrency</p>
        </div>
      `;
    }

    return this.userCryptos.map(crypto => `
      <div class="crypto-card" data-id="${crypto.id}">
        <div class="crypto-header">
          <div class="crypto-main-info">
            <h3 class="crypto-symbol">${crypto.symbol.toUpperCase()}</h3>
            <span class="crypto-name">${crypto.name}</span>
          </div>
          <button class="remove-crypto-btn" data-id="${crypto.id}">×</button>
        </div>
        
        <div class="crypto-stats">
          ${crypto.current_price ? `
            <div class="stat">
              <span class="stat-label">Pris:</span>
              <span class="stat-value">$${crypto.current_price.toLocaleString()}</span>
            </div>
          ` : ''}
          
          ${crypto.price_change_percentage_24h !== undefined ? `
            <div class="stat">
              <span class="stat-label">24h förändring:</span>
              <span class="stat-value ${crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                ${crypto.price_change_percentage_24h >= 0 ? '+' : ''}${crypto.price_change_percentage_24h.toFixed(2)}%
              </span>
            </div>
          ` : ''}
          
          ${crypto.market_cap ? `
            <div class="stat">
              <span class="stat-label">Market Cap:</span>
              <span class="stat-value">$${crypto.market_cap.toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
        
        ${crypto.addedAt ? `
          <small class="added-date">Tillagd: ${new Date(crypto.addedAt).toLocaleString('sv-SE')}</small>
        ` : ''}
      </div>
    `).join('');
  }

  async addEventListeners(router: any) {

    const isAuthorized = await requireAuth(router, async () => {

      await this.loadUserCryptos();
    });


    if (!isAuthorized) {
      await router.navigate('/');
      return;
    }


    const navLogoutBtn = document.getElementById('nav-logout');
    if (navLogoutBtn) {
      navLogoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Är du säker på att du vill logga ut?')) {
          logout();
          await router.navigate('/');
        }
      });
    }


    const deleteAccountBtn = document.getElementById('delete-account');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Är du säker på att du vill ta bort ditt konto permanent? Detta kan inte ångras.')) {
          await this.handleDeleteAccount(router);
        }
      });
    }


    const searchInput = document.getElementById('crypto-search') as HTMLInputElement;
    const searchBtn = document.getElementById('search-btn');

    if (searchInput && searchBtn) {

      searchBtn.addEventListener('click', async () => {
        await this.handleSearch();
      });


      searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          await this.handleSearch();
        }
      });


      searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() === '') {
          this.searchResults = [];
          this.updateSearchResults();
        }
      });
    }


    this.addCryptoActionListeners();


    await this.loadUserCryptos();
  }

  private addCryptoActionListeners() {

    document.querySelectorAll('.add-crypto-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const id = target.dataset.id;
        const symbol = target.dataset.symbol;
        const name = target.dataset.name;

        if (id && symbol && name) {
          await this.addCryptoToPortfolio(id, symbol, name);
        }
      });
    });


    document.querySelectorAll('.remove-crypto-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id && confirm('Är du säker på att du vill ta bort denna cryptocurrency från din portfolio?')) {
          await this.removeCryptoFromPortfolio(id);
        }
      });
    });
  }

  private async handleSearch() {
    const searchInput = document.getElementById('crypto-search') as HTMLInputElement;
    const query = searchInput.value.trim();

    if (!query || query.length < 2) return;

    this.isSearching = true;
    this.updateSearchResults();

    try {
      const response = await fetch(`/api/crypto/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        this.searchResults = result.data;
      } else {
        console.error('Search failed:', result.message);
        this.searchResults = [];
      }
    } catch (error) {
      console.error('Error searching cryptos:', error);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
      this.updateSearchResults();
    }
  } private async loadUserCryptos() {
    try {

      const authState = (window as any).authGuard?.getAuthState() || {};
      const userId = authState.user?.id;

      if (!userId) {
        console.log('No user ID found');
        this.userCryptos = [];
        this.updateCryptoList();
        return;
      }

      const response = await fetch(`/api/crypto/user/${userId}`);
      const result = await response.json();

      if (result.success) {
        this.userCryptos = result.data;
      } else {
        console.error('Failed to load user cryptos:', result.message);
        this.userCryptos = [];
      }

      this.updateCryptoList();
    } catch (error) {
      console.error('Error loading user cryptos:', error);
      this.userCryptos = [];
      this.updateCryptoList();
    }
  }

  private async addCryptoToPortfolio(id: string, symbol: string, name: string) {
    try {

      const authState = (window as any).authGuard?.getAuthState() || {};
      const userId = authState.user?.id;

      if (!userId) {
        alert('Du måste vara inloggad för att lägga till cryptocurrency');
        return;
      }

      const response = await fetch(`/api/crypto/user/${userId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cryptoId: parseInt(id),
          symbol,
          name
        })
      });

      const result = await response.json();

      if (result.success) {

        await this.loadUserCryptos();


        this.searchResults = [];
        this.updateSearchResults();


        const searchInput = document.getElementById('crypto-search') as HTMLInputElement;
        if (searchInput) searchInput.value = '';

        alert(`${name} har lagts till i din portfolio!`);
      } else {
        alert(result.message || 'Ett fel uppstod när cryptocurrency skulle läggas till');
      }
    } catch (error) {
      console.error('Error adding crypto:', error);
      alert('Ett fel uppstod när cryptocurrency skulle läggas till');
    }
  } private async removeCryptoFromPortfolio(id: string) {
    try {

      const authState = (window as any).authGuard?.getAuthState() || {};
      const userId = authState.user?.id;

      if (!userId) {
        alert('Du måste vara inloggad för att ta bort cryptocurrency');
        return;
      }

      const response = await fetch(`/api/crypto/user/${userId}/remove/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {

        await this.loadUserCryptos();
        alert('Cryptocurrency borttagen från portfolio');
      } else {
        alert(result.message || 'Ett fel uppstod när cryptocurrency skulle tas bort');
      }
    } catch (error) {
      console.error('Error removing crypto:', error);
      alert('Ett fel uppstod när cryptocurrency skulle tas bort');
    }
  }

  private updateSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = this.renderSearchResults();
      this.addCryptoActionListeners();
    }
  }

  private updateCryptoList() {
    const listContainer = document.getElementById('crypto-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderCryptoList();
      this.addCryptoActionListeners();
    }
  }

  private async handleDeleteAccount(router: any) {
    try {
      const authState = getAuthState();
      if (!authState.token) {
        alert('Du är inte inloggad');
        await router.navigate('/');
        return;
      }

      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('Ditt konto har tagits bort permanent');
        logout();
        await router.navigate('/');
      } else {
        alert(result.message || 'Ett fel uppstod när kontot skulle tas bort');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Ett fel uppstod när kontot skulle tas bort');
    }
  }
}