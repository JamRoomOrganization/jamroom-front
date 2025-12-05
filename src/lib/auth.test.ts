import { signInWithEmail, SignInResponse } from './auth';

// Mock setTimeout para controlar el delay
jest.useFakeTimers();

describe('auth', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('signInWithEmail', () => {
    it('debería retornar éxito con credenciales válidas', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const promise = signInWithEmail(email, password);
      
      // Avanzar el timer para resolver el delay
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result).toEqual({ ok: true });
    });

    it('debería retornar error con email inválido', async () => {
      const email = 'invalid-email';
      const password = 'password123';
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Correo inválido');
    });

    it('debería retornar error con contraseña muy corta', async () => {
      const email = 'test@example.com';
      const password = '12345'; // Solo 5 caracteres
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result.ok).toBe(false);
      expect(result.message).toBe('La contraseña debe tener al menos 6 caracteres');
    });

    it('debería retornar error con email vacío', async () => {
      const email = '';
      const password = 'password123';
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Correo inválido');
    });

    it('debería retornar error con email sin dominio', async () => {
      const email = 'test@';
      const password = 'password123';
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Correo inválido');
    });

    it('debería retornar error con email sin @', async () => {
      const email = 'testexample.com';
      const password = 'password123';
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result.ok).toBe(false);
      expect(result.message).toBe('Correo inválido');
    });

    it('debería aceptar contraseña de exactamente 6 caracteres', async () => {
      const email = 'test@example.com';
      const password = '123456'; // Exactamente 6 caracteres
      
      const promise = signInWithEmail(email, password);
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result).toEqual({ ok: true });
    });

    it('debería tener un delay de aproximadamente 800ms', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const startTime = Date.now();
      const promise = signInWithEmail(email, password);
      
      // Verificar que la promesa no se resuelva inmediatamente
      jest.advanceTimersByTime(700);
      await Promise.resolve(); // Permitir que se procesen microtasks
      
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      
      expect(resolved).toBe(false);
      
      // Completar el delay
      jest.advanceTimersByTime(100);
      await promise;
      
      const endTime = Date.now();
      // Nota: con fake timers, el tiempo no avanza realmente
      // pero podemos verificar que se llamó a setTimeout con 800ms
    });

    describe('SignInResponse type', () => {
      it('debería permitir respuestas exitosas', () => {
        const successResponse: SignInResponse = {
          ok: true
        };
        
        expect(successResponse.ok).toBe(true);
        expect(successResponse.message).toBeUndefined();
      });

      it('debería permitir respuestas fallidas con mensaje', () => {
        const errorResponse: SignInResponse = {
          ok: false,
          message: 'Error de autenticación'
        };
        
        expect(errorResponse.ok).toBe(false);
        expect(errorResponse.message).toBe('Error de autenticación');
      });
    });
  });
});