import { Suspense } from 'react';
import ConfirmForm from './ConfirmForm';


export default function ConfirmPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-4">
            <div className="text-white text-xl">Cargando formulario de confirmación...</div>
        </div>
    }>
      <ConfirmForm />
    </Suspense>
  );
}
