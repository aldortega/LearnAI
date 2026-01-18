import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

import { useAuth } from "../../../shared/hooks/useAuth";

type Props = {
  onError?: (error: string) => void;
};

export function GoogleLoginButton({ onError }: Props) {
  const { googleLogin } = useAuth();

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      onError?.("No se recibió credencial de Google");
      return;
    }

    try {
      await googleLogin(response.credential);
    } catch (e) {
      const msg = (e as { message?: string }).message;
      onError?.(msg ?? "Error al iniciar sesión con Google");
    }
  };

  const handleError = () => {
    onError?.("Error al iniciar sesión con Google");
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      theme="outline"
      size="large"
      width={300}
      text="continue_with"
      shape="rectangular"
    />
  );
}
