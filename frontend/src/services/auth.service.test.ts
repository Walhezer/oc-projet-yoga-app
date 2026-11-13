import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service';
import api from './api';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('Auth Service', () => {
  const mockUserResponse = {
    token: 'fake-jwt-token',
    id: 1,
    email: 'test@test.com',
    admin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should call api and set localStorage on successful login with token', async () => {
      (api.post as any).mockResolvedValue({ data: mockUserResponse });

      const credentials = { email: 'test@test.com', password: 'password123' };
      const result = await authService.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockUserResponse);
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(mockUserResponse));
    });

    it('should not set localStorage if response data has no token', async () => {
      const responseWithoutToken = { id: 1, email: 'test@test.com' };
      (api.post as any).mockResolvedValue({ data: responseWithoutToken });

      await authService.login({ email: 'test@test.com', password: 'password' });

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('register', () => {
    it('should call api and set localStorage on successful register with token', async () => {
      (api.post as any).mockResolvedValue({ data: mockUserResponse });

      const registerData = { email: 'new@test.com', password: 'pass', firstName: 'John', lastName: 'Doe' };
      const result = await authService.register(registerData);

      expect(api.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result).toEqual(mockUserResponse);
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    });

    it('should not set localStorage if register response data has no token', async () => {
      (api.post as any).mockResolvedValue({ data: { id: 2 } });

      await authService.register({ email: 'test@test.com', password: 'pass', firstName: 'A', lastName: 'B' });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should remove token and user from localStorage', () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));

      authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return parsed user object if it exists in localStorage', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, admin: true }));
      
      const user = authService.getCurrentUser();
      
      expect(user).toEqual({ id: 1, admin: true });
    });

    it('should return null if user does not exist in localStorage', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('updateCurrentUser', () => {
    it('should return null if there is no user in localStorage', () => {
      const result = authService.updateCurrentUser({ admin: true });
      expect(result).toBeNull();
    });

    it('should update existing user, save to localStorage and return updated user', () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Old Name' }));

      const result = authService.updateCurrentUser({ firstName: 'New Name' } as any);

      expect(result).toEqual({ id: 1, name: 'Old Name', firstName: 'New Name' });
      expect(localStorage.getItem('user')).toEqual(JSON.stringify({ id: 1, name: 'Old Name', firstName: 'New Name' }));
    });
  });

  describe('getToken & isAuthenticated', () => {
    it('getToken should return the token from localStorage', () => {
      localStorage.setItem('token', 'my-token');
      expect(authService.getToken()).toBe('my-token');
    });

    it('isAuthenticated should return true if token exists', () => {
      localStorage.setItem('token', 'my-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated should return false if token does not exist', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});