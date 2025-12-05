import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


