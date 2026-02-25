import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig } from "swr";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import App from "./App.tsx";
import type { ApiError } from "./shared/lib/apiClient";

function isApiError(error: unknown): error is ApiError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <SWRConfig
        value={{
          dedupingInterval: 5000,
          revalidateOnFocus: false,
          onErrorRetry: (error, _key, _config, revalidate, options) => {
            if (isApiError(error) && error.status === 404) {
              return;
            }

            if (options.retryCount >= 3) {
              return;
            }

            window.setTimeout(() => {
              void revalidate(options);
            }, 3000);
          },
        }}
      >
        <App />
      </SWRConfig>
    </GoogleOAuthProvider>
  </StrictMode>,
);
