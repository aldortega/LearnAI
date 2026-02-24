import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError } from "../lib/apiClient";
import { useAuth } from "./useAuth";
import { useGenerationMonitor } from "../generation/context";
import {
  buildGenerationJobKey,
  type GenerationJobBase,
  type GenerationKind,
} from "../generation/types";

type UseGenerationJobOptions<TPayload, TJob extends GenerationJobBase> = {
  notebookId?: string;
  kind: GenerationKind;
  generateRequest: (notebookId: string, payload: TPayload) => Promise<TJob>;
  getLatestRequest: (notebookId: string) => Promise<TJob | null>;
  defaultFailedError: string;
  toErrorMessage?: (error: unknown) => string;
};

type Result<TPayload, TJob extends GenerationJobBase> = {
  generate: (payload: TPayload) => Promise<TJob | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<TJob | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerationJob<TPayload, TJob extends GenerationJobBase>(
  options: UseGenerationJobOptions<TPayload, TJob>,
): Result<TPayload, TJob> {
  const {
    notebookId,
    kind,
    generateRequest,
    getLatestRequest,
    defaultFailedError,
    toErrorMessage,
  } = options;
  const { user } = useAuth();
  const { trackJob, waitForJob } = useGenerationMonitor();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRunIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      activeRunIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    activeRunIdRef.current += 1;
    isRunningRef.current = false;
    setIsGenerating(false);
    setError(null);
  }, [notebookId]);

  const clearError = useCallback(() => setError(null), []);

  const startRun = useCallback(() => {
    const nextRunId = activeRunIdRef.current + 1;
    activeRunIdRef.current = nextRunId;
    return nextRunId;
  }, []);

  const isRunActive = useCallback(
    (runId: number) => isMountedRef.current && activeRunIdRef.current === runId,
    [],
  );

  const waitTrackedJob = useCallback(
    async (job: TJob, runId: number): Promise<TJob | null> => {
      if (!notebookId || !user) return null;

      const key = trackJob({
        ownerId: user.id,
        notebookId,
        kind,
        jobId: job.job_id,
        initialStatus: job.status,
        initialError: job.error ?? null,
      });

      const terminal = await waitForJob<TJob>(key);
      if (!terminal) {
        return null;
      }
      if (!isRunActive(runId)) {
        return null;
      }
      return terminal;
    },
    [kind, notebookId, trackJob, user, waitForJob, isRunActive],
  );

  const generate = useCallback(
    async (payload: TPayload): Promise<TJob | null> => {
      if (!notebookId || !user) return null;
      if (isRunningRef.current) return null;

      isRunningRef.current = true;
      const runId = startRun();

      if (isMountedRef.current) {
        setIsGenerating(true);
        setError(null);
      }

      try {
        const job = await generateRequest(notebookId, payload);
        if (job.status === "done") {
          return job;
        }
        if (job.status === "failed") {
          if (isRunActive(runId)) {
            setError(job.error ?? defaultFailedError);
          }
          return null;
        }

        const result = await waitTrackedJob(job, runId);
        if (!result) return null;
        if (result.status === "failed") {
          if (isRunActive(runId)) {
            setError(result.error ?? defaultFailedError);
          }
          return null;
        }
        return result;
      } catch (e) {
        if (isRunActive(runId)) {
          setError(toErrorMessage?.(e) ?? "No se pudo completar la accion.");
        }
        return null;
      } finally {
        isRunningRef.current = false;
        if (isRunActive(runId)) {
          setIsGenerating(false);
        }
      }
    },
    [
      defaultFailedError,
      generateRequest,
      isRunActive,
      notebookId,
      startRun,
      toErrorMessage,
      user,
      waitTrackedJob,
    ],
  );

  const resumeLatest = useCallback(
    async (resumeOptions?: { suppressFailedError?: boolean }): Promise<TJob | null> => {
      if (!notebookId || !user) return null;
      if (isRunningRef.current) return null;

      const suppressFailedError = resumeOptions?.suppressFailedError ?? false;

      isRunningRef.current = true;
      const runId = startRun();

      if (isMountedRef.current) {
        setError(null);
      }

      try {
        const job = await getLatestRequest(notebookId);
        if (!job) return null;

        if (job.status === "done") {
          return job;
        }

        if (job.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
            setError(job.error ?? defaultFailedError);
          }
          return null;
        }

        if (!isRunActive(runId)) {
          return null;
        }

        if (isMountedRef.current) {
          setIsGenerating(true);
        }

        const key = buildGenerationJobKey(kind, notebookId, job.job_id);
        trackJob({
          ownerId: user.id,
          notebookId,
          kind,
          jobId: job.job_id,
          initialStatus: job.status,
          initialError: job.error ?? null,
        });

        const result = await waitForJob<TJob>(key);
        if (!result) return null;
        if (!isRunActive(runId)) return null;

        if (result.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
            setError(result.error ?? defaultFailedError);
          }
          return null;
        }

        return result;
      } catch (e) {
        if (!isRunActive(runId)) {
          return null;
        }

        const apiError = e as ApiError | undefined;
        if (apiError?.status === 404) {
          return null;
        }

        if (!suppressFailedError && isRunActive(runId)) {
          setError(toErrorMessage?.(e) ?? "No se pudo completar la accion.");
        }
        return null;
      } finally {
        isRunningRef.current = false;
        if (isRunActive(runId)) {
          setIsGenerating(false);
        }
      }
    },
    [
      defaultFailedError,
      getLatestRequest,
      isRunActive,
      kind,
      notebookId,
      startRun,
      toErrorMessage,
      trackJob,
      user,
      waitForJob,
    ],
  );

  return { generate, resumeLatest, isGenerating, error, clearError };
}
