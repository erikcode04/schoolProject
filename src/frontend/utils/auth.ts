import type { Router } from '../router.ts';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
}

export class AuthGuard {
  private static instance: AuthGuard;
  private authState: AuthState = {
    isAuthenticated: false,
    token: null,
    user: null
  };

  private constructor() {
    this.checkAuthOnInit();
  }

  public static getInstance(): AuthGuard {
    if (!AuthGuard.instance) {
      AuthGuard.instance = new AuthGuard();
    }
    return AuthGuard.instance;
  }

  public async isAuthenticated(): Promise<boolean> {
    const token = this.getTokenFromCookie();
    if (!token) {
      this.authState.isAuthenticated = false;
      return false;
    }


    try {

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp > currentTime) {

        this.authState.isAuthenticated = true;
        this.authState.token = token;
        this.authState.user = payload.userId ? { id: payload.userId, email: payload.email } : null;
        console.log('AuthGuard: Token is valid (local check)');
        return true;
      } else {
        console.log('AuthGuard: Token expired (local check)');
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('AuthGuard: Error parsing token locally:', error);
      this.logout();
      return false;
    }
  }

  public async verifyTokenWithServer(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();
      console.log('AuthGuard: Server response:', result);

      if (result.success && result.user) {
        console.log('AuthGuard: Server verification successful');
        this.authState.user = result.user;
        return true;
      } else {
        console.log('AuthGuard: Server verification failed:', result.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('AuthGuard: Server verification error:', error);
      return false;
    }
  }

  public async requireAuth(router: Router, onAuthenticated?: () => void): Promise<boolean> {
    console.log('AuthGuard: Checking authentication...');


    if (router.getCurrentRoute() === '/') {
      console.log('AuthGuard: Already on login page, skipping auth check');
      return false;
    }


    if (await this.isAuthenticated()) {

      const token = this.getTokenFromCookie();
      if (token) {
        const serverValid = await this.verifyTokenWithServer(token);
        if (serverValid) {
          console.log('AuthGuard: User is authenticated (both local and server)');
          if (onAuthenticated) {
            onAuthenticated();
          }
          return true;
        } else {
          console.log('AuthGuard: Server rejected token, logging out');
          this.logout();
          this.redirectToLogin(router);
          return false;
        }
      }
    }

    console.log('AuthGuard: User not authenticated, redirecting to login');
    this.redirectToLogin(router);
    return false;
  }

  public login(token: string, userData?: any): void {
    this.setTokenCookie(token);


    try {
      localStorage.setItem('auth_token_backup', token);
      console.log('AuthGuard: Token also saved to localStorage as backup');
    } catch (error) {
      console.warn('AuthGuard: Could not save to localStorage:', error);
    }

    this.authState.isAuthenticated = true;
    this.authState.token = token;
    this.authState.user = userData || null;

    console.log('AuthGuard: User logged in successfully');
  }

  public logout(): void {
    this.removeTokenCookie();


    try {
      localStorage.removeItem('auth_token_backup');
      console.log('AuthGuard: Backup token removed from localStorage');
    } catch (error) {
      console.warn('AuthGuard: Could not remove from localStorage:', error);
    }

    this.authState = {
      isAuthenticated: false,
      token: null,
      user: null
    };

    console.log('AuthGuard: User logged out');
  }

  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  private redirectToLogin(router: Router): void {
    console.log('AuthGuard: Redirecting to login page');

    setTimeout(async () => {
      await router.navigate('/');
    }, 0);
  }

  private getTokenFromCookie(): string | null {
    console.log('AuthGuard: Reading all cookies:', document.cookie);


    const methods = [

      () => {
        const name = 'auth_token=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookies = decodedCookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
          let cookie = cookies[i].trim();
          if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
          }
        }
        return null;
      },


      () => {
        const match = document.cookie.match(/auth_token=([^;]+)/);
        return match ? match[1] : null;
      },


      () => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'auth_token') {
            return value;
          }
        }
        return null;
      }
    ];


    for (let i = 0; i < methods.length; i++) {
      try {
        const token = methods[i]();
        if (token) {
          console.log(`AuthGuard: Method ${i + 1} found token:`, token.substring(0, 20) + '...');
          return token;
        }
      } catch (error) {
        console.warn(`AuthGuard: Method ${i + 1} failed:`, error);
      }
    }

    console.log('AuthGuard: No token in cookies, checking localStorage...');


    try {
      const backupToken = localStorage.getItem('auth_token_backup');
      if (backupToken) {
        console.log('AuthGuard: Found backup token in localStorage');
        return backupToken;
      }
    } catch (error) {
      console.warn('AuthGuard: Could not access localStorage:', error);
    }

    console.log('AuthGuard: No token found anywhere');
    return null;
  }

  private setTokenCookie(token: string): void {

    const expires = new Date();
    expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000));


    const formats = [
      `auth_token=${token}; expires=${expires.toUTCString()}; path=/`,
      `auth_token=${token}; path=/`,
      `auth_token=${token}`
    ];

    console.log('AuthGuard: Trying to set cookie...');
    console.log('AuthGuard: Token length:', token.length);


    for (let i = 0; i < formats.length; i++) {
      document.cookie = formats[i];
      console.log(`AuthGuard: Tried format ${i + 1}:`, formats[i]);


      setTimeout(() => {
        const testCookie = this.getTokenFromCookie();
        if (testCookie) {
          console.log(`AuthGuard: Format ${i + 1} worked!`);
          return;
        }
      }, 10);
    }
  }

  private removeTokenCookie(): void {
    document.cookie = 'auth_token=; max-age=0; path=/; SameSite=Lax';
    console.log('AuthGuard: Cookie removed');
  }

  private async checkAuthOnInit(): Promise<void> {
    await this.isAuthenticated();
  }
}

export function requireAuth(router: Router, onAuthenticated?: () => void): Promise<boolean> {
  const authGuard = AuthGuard.getInstance();


  (window as any).authGuard = authGuard;

  return authGuard.requireAuth(router, onAuthenticated);
}

export function login(token: string, userData?: any): void {
  const authGuard = AuthGuard.getInstance();
  authGuard.login(token, userData);
}

export function logout(): void {
  const authGuard = AuthGuard.getInstance();
  authGuard.logout();
}

export function getAuthState(): AuthState {
  const authGuard = AuthGuard.getInstance();
  return authGuard.getAuthState();
}

export function isAuthenticated(): Promise<boolean> {
  const authGuard = AuthGuard.getInstance();
  return authGuard.isAuthenticated();
}