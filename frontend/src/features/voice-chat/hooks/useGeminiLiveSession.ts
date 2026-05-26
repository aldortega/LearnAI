import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleGenAI,
  Modality,
  type FunctionDeclaration,
  type LiveServerMessage,
  type Session,
} from "@google/genai";

import { voiceApi } from "../api/voiceApi";
import type { VoicePhase, VoiceTokenResponse } from "../types";

import recorderWorkletUrl from "../audio/recorder-worklet.js?url";
import playerWorkletUrl from "../audio/player-worklet.js?url";

type UseGeminiLiveSessionResult = {
  phase: VoicePhase;
  error: string | null;
  muted: boolean;
  start: () => void;
  toggleMute: () => void;
  end: () => void;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function useGeminiLiveSession(
  notebookId: string | undefined,
): UseGeminiLiveSessionResult {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tokenInfoRef = useRef<VoiceTokenResponse | null>(null);
  const stoppedRef = useRef(false);
  const phaseRef = useRef<VoicePhase>("idle");

  const setPhaseSafe = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    if (recorderNodeRef.current) {
      try {
        recorderNodeRef.current.port.onmessage = null;
        recorderNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      recorderNodeRef.current = null;
    }
    if (playerNodeRef.current) {
      try {
        playerNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      playerNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close().catch(() => undefined);
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close().catch(() => undefined);
      outputCtxRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        /* noop */
      }
      sessionRef.current = null;
    }
  }, []);

  const handleToolCall = useCallback(
    async (message: LiveServerMessage) => {
      const session = sessionRef.current;
      const tokenInfo = tokenInfoRef.current;
      if (!session || !tokenInfo) return;
      const calls = message.toolCall?.functionCalls ?? [];
      if (calls.length === 0) return;

      setPhaseSafe("thinking");
      const responses = await Promise.all(
        calls.map(async (call) => {
          if (call.name !== tokenInfo.tool_name) {
            return {
              id: call.id,
              name: call.name ?? tokenInfo.tool_name,
              response: { error: "Unknown tool" },
            };
          }
          const args = (call.args ?? {}) as { query?: string };
          const query = args.query?.trim() ?? "";
          if (!query) {
            return {
              id: call.id,
              name: call.name,
              response: { chunks: [] },
            };
          }
          try {
            const result = await voiceApi.retrieve(tokenInfo.notebook_id, query);
            return {
              id: call.id,
              name: call.name,
              response: { chunks: result.chunks },
            };
          } catch (err) {
            return {
              id: call.id,
              name: call.name,
              response: {
                chunks: [],
                error: err instanceof Error ? err.message : "retrieve failed",
              },
            };
          }
        }),
      );

      session.sendToolResponse({ functionResponses: responses });
    },
    [setPhaseSafe],
  );

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      if (message.toolCall?.functionCalls?.length) {
        void handleToolCall(message);
        return;
      }
      const content = message.serverContent;
      if (!content) return;

      if (content.interrupted) {
        playerNodeRef.current?.port.postMessage({ type: "flush" });
      }

      const parts = content.modelTurn?.parts ?? [];
      for (const part of parts) {
        const data = part.inlineData?.data;
        if (typeof data === "string" && data.length > 0) {
          playerNodeRef.current?.port.postMessage(
            { type: "push", buffer: base64ToArrayBuffer(data) },
          );
          if (phaseRef.current !== "speaking") setPhaseSafe("speaking");
        }
      }

      if (content.turnComplete || content.generationComplete) {
        if (phaseRef.current !== "listening" && !stoppedRef.current) {
          setPhaseSafe("listening");
        }
      }
    },
    [handleToolCall, setPhaseSafe],
  );

  const start = useCallback(() => {
    if (!notebookId) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "ended" && phaseRef.current !== "error") {
      return;
    }
    stoppedRef.current = false;
    setError(null);
    setPhaseSafe("connecting");

    void (async () => {
      try {
        const tokenInfo = await voiceApi.fetchToken(notebookId);
        tokenInfoRef.current = tokenInfo;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        });
        streamRef.current = stream;
        if (stoppedRef.current) return;

        const InputAudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const inputCtx = new InputAudioCtx();
        inputCtxRef.current = inputCtx;
        const outputCtx = new InputAudioCtx({ sampleRate: 24000 });
        outputCtxRef.current = outputCtx;

        await Promise.all([
          inputCtx.audioWorklet.addModule(recorderWorkletUrl),
          outputCtx.audioWorklet.addModule(playerWorkletUrl),
        ]);
        if (stoppedRef.current) return;

        const recorder = new AudioWorkletNode(inputCtx, "voice-recorder");
        const player = new AudioWorkletNode(outputCtx, "voice-player");
        recorderNodeRef.current = recorder;
        playerNodeRef.current = player;
        player.connect(outputCtx.destination);
        inputCtx.createMediaStreamSource(stream).connect(recorder);

        const ai = new GoogleGenAI({
          apiKey: tokenInfo.token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        recorder.port.onmessage = (event) => {
          const buffer = event.data as ArrayBuffer;
          const session = sessionRef.current;
          if (!session || stoppedRef.current) return;
          const base64 = bytesToBase64(new Uint8Array(buffer));
          session.sendRealtimeInput({
            audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
          });
        };

        const session = await ai.live.connect({
          model: tokenInfo.model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: { parts: [{ text: tokenInfo.system_instruction }] },
            tools: [
              {
                functionDeclarations: [
                  tokenInfo.tool_schema as unknown as FunctionDeclaration,
                ],
              },
            ],
          },
          callbacks: {
            onopen: () => {
              if (stoppedRef.current) return;
              setPhaseSafe("listening");
            },
            onmessage: handleMessage,
            onerror: (event) => {
              setError(event.message || "Error en la conexion de voz");
              setPhaseSafe("error");
              cleanup();
            },
            onclose: () => {
              if (stoppedRef.current) return;
              setPhaseSafe("ended");
              cleanup();
            },
          },
        });
        sessionRef.current = session;
        if (stoppedRef.current) {
          cleanup();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo iniciar la voz");
        setPhaseSafe("error");
        cleanup();
      }
    })();
  }, [notebookId, handleMessage, cleanup, setPhaseSafe]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      recorderNodeRef.current?.port.postMessage({ type: "mute", muted: next });
      return next;
    });
  }, []);

  const end = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "ended") return;
    cleanup();
    setPhaseSafe("ended");
  }, [cleanup, setPhaseSafe]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { phase, error, muted, start, toggleMute, end };
}
