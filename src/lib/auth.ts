export type SignInResponse = {
  ok: boolean;
  message?: string;
};

export async function signInWithEmail(
  email: string,
  password: string
): Promise<SignInResponse> {
  // Simulación de delay de red
  await new Promise((resolve) => setTimeout(resolve, 800));

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  if (!isEmailValid) {
    return { ok: false, message: "Correo inválido" };
  }
  if (!isPasswordValid) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres" };
  }

  // Mock: acepta cualquier credencial válida de forma estática
  return { ok: true };
}


