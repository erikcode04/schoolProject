import { login } from '../utils/auth.ts';

export class AuthPage {
  private currentMode: 'login' | 'signup' = 'login'; render(): string {
    return `
      <div class="page">
        <div class="auth-container">
          <h1>${this.currentMode === 'login' ? 'Logga in' : 'Skapa konto'}</h1>
          
          <div class="auth-tabs">
            <button id="login-tab" class="tab-button ${this.currentMode === 'login' ? 'active' : ''}">
              Logga in
            </button>
            <button id="signup-tab" class="tab-button ${this.currentMode === 'signup' ? 'active' : ''}">
              Skapa konto
            </button>
          </div>

          <form id="auth-form" class="auth-form">
            ${this.currentMode === 'signup' ? `
              <div class="form-group">
                <label for="fullname">Fullständigt namn:</label>
                <input type="text" id="fullname" name="fullname" required>
              </div>
            ` : ''}
            
            <div class="form-group">
              <label for="email">E-post:</label>
              <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
              <label for="password">Lösenord:</label>
              <input type="password" id="password" name="password" required>
            </div>
            
            ${this.currentMode === 'signup' ? `
              <div class="form-group">
                <label for="confirmPassword">Bekräfta lösenord:</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
              </div>
            ` : ''}
            
            <div class="form-actions">
              <button type="submit" id="auth-submit" class="auth-button">
                ${this.currentMode === 'login' ? 'Logga in' : 'Skapa konto'}
              </button>
            </div>
          </form>
          
          <div class="auth-message" id="auth-message"></div>
          
          <div class="demo-access">
            <p>Demo: Klicka på "Fortsätt utan inloggning" för att testa appen</p>
            <button id="demo-login" class="demo-button">Fortsätt utan inloggning</button>
          </div>
        </div>
      </div>
    `;
  }

  addEventListeners(router: any) {
    
    (window as any).currentRouter = router;

    this.setupTabSwitching();
    this.setupFormSubmission(router);
    this.setupDemoLogin(router);
  }

  private setupTabSwitching() {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');

    if (loginTab) {
      loginTab.addEventListener('click', () => {
        this.currentMode = 'login';
        this.rerenderForm();
      });
    }

    if (signupTab) {
      signupTab.addEventListener('click', () => {
        this.currentMode = 'signup';
        this.rerenderForm();
      });
    }
  }

  private setupFormSubmission(router: any) {
    const form = document.getElementById('auth-form') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAuthSubmit(router);
      });
    }
  }

  private setupDemoLogin(router: any) {
    const demoButton = document.getElementById('demo-login');
    if (demoButton) {
      demoButton.addEventListener('click', () => {
        
        const demoToken = this.createDemoToken();

        
        login(demoToken, { name: 'Demo User', email: 'demo@example.com' });

        this.showMessage('Demo-inloggning lyckades!', 'success');
        setTimeout(async () => {
          await router.navigate('/items');
        }, 1000);
      });
    }
  } private async handleAuthSubmit(router: any) {
    const form = document.getElementById('auth-form') as HTMLFormElement;
    const formData = new FormData(form);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (this.currentMode === 'signup') {
      const fullname = formData.get('fullname') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      if (password !== confirmPassword) {
        this.showMessage('Lösenorden matchar inte!', 'error');
        return;
      }

      if (!fullname || fullname.trim().length < 2) {
        this.showMessage('Ange ett giltigt namn!', 'error');
        return;
      }
    }

    if (!email || !password) {
      this.showMessage('Alla fält måste fyllas i!', 'error');
      return;
    }

    try {
      const endpoint = this.currentMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const requestBody = this.currentMode === 'signup'
        ? {
          fullname: formData.get('fullname') as string,
          email,
          password
        }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success && result.token) {
        
        login(result.token, result.user);

        this.showMessage(
          this.currentMode === 'login' ? 'Inloggning lyckades!' : 'Konto skapat!',
          'success'
        );

        
        setTimeout(async () => {
          await router.navigate('/items');
        }, 1500);

      } else {
        this.showMessage(result.message || 'Ett fel uppstod', 'error');
      }

    } catch (error) {
      console.error('Auth error:', error);
      this.showMessage('Ett fel uppstod. Försök igen.', 'error');
    }
  }

  private rerenderForm() {
    const page = document.querySelector('.page');
    if (page) {
      page.innerHTML = this.render().match(/<div class="page">([\s\S]*)<\/div>/)?.[1] || '';
      
      const router = (window as any).currentRouter; 
      if (router) {
        this.addEventListeners(router);
      }
    }
  }

  private showMessage(message: string, type: 'success' | 'error') {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `auth-message ${type}`;

      
      setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
      }, 3000);
    }
  }

  private createDemoToken(): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: 'demo-user',
      name: 'Demo User',
      email: 'demo@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
    }));
    const signature = btoa('demo-signature');

    return `${header}.${payload}.${signature}`;
  }
}