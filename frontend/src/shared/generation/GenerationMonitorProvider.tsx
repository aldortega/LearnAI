import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAuth } from "../hooks/useAuth";
import { useToast } from "../ui/toast/useToast";
import { GenerationMonitorContext, type TrackJobInput } from "./context";
import { generationKindLabels, getGenerationStatusFetcher } from "./registry";
import {
  buildGenerationJobKey,
  type GenerationJobBase,
  type TrackedGenerationJob,
} from "./types";

const STORAGE_KEY = "generation-monitor-active-jobs";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Waiter = (job: GenerationJobBase | null) => void;

type Props = {
  children: React.ReactNode;
};

export function GenerationMonitorProvider({ children }: Props) {
  const { user } = useAuth();
  const { pushToast, upsertToast, removeToast } = useToast();

  const jobsRef = useRef<Map<string, TrackedGenerationJob>>(new Map());
  const waitersRef = useRef<Map<string, Set<Waiter>>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());
  const loadedForUserRef = useRef<string | null>(null);

  const flushStorage = useCallback(() => {
    const activeJobs = Array.from(jobsRef.current.values())
      .filter((item) => item.status === "queued" || item.status === "processing")
      .map((item) => ({
        key: item.key,
        ownerId: item.ownerId,
        notebookId: item.notebookId,
        kind: item.kind,
        jobId: item.jobId,
        status: item.status,
        error: item.error,
        trackedAt: item.trackedAt,
        updatedAt: item.updatedAt,
      }));

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeJobs));
  }, []);

  const resolveWaiters = useCallback((key: string, payload: GenerationJobBase | null) => {
    const set = waitersRef.current.get(key);
    if (!set) return;

    waitersRef.current.delete(key);
    for (const resolve of set) {
      resolve(payload);
    }
  }, []);

  const finalizeJob = useCallback(
    (
      key: string,
      payload: GenerationJobBase,
      opts?: { notify?: boolean },
    ) => {
      const current = jobsRef.current.get(key);
      if (!current) return;

      removeToast(key);
      jobsRef.current.delete(key);
      inFlightRef.current.delete(key);
      flushStorage();
      resolveWaiters(key, payload);

      if (!opts?.notify) {
        return;
      }

      const label = generationKindLabels[current.kind];
      if (payload.status === "done") {
        pushToast({
          variant: "success",
          title: `Se completo ${label}`,
        });
        return;
      }

      pushToast({
        variant: "error",
        title: `Fallo la generacion de ${label}`,
        description: payload.error ?? undefined,
      });
    },
    [flushStorage, pushToast, removeToast, resolveWaiters],
  );

  const clearAllJobs = useCallback(() => {
    const keys = Array.from(jobsRef.current.keys());
    jobsRef.current.clear();
    inFlightRef.current.clear();
    for (const key of keys) {
      removeToast(key);
    }
    for (const key of keys) {
      resolveWaiters(key, null);
    }
    waitersRef.current.clear();
    sessionStorage.removeItem(STORAGE_KEY);
  }, [removeToast, resolveWaiters]);

  const trackJob = useCallback(
    ({ ownerId, notebookId, kind, jobId, initialStatus, initialError }: TrackJobInput) => {
      const key = buildGenerationJobKey(kind, notebookId, jobId);
      const now = Date.now();
      const previous = jobsRef.current.get(key);

      jobsRef.current.set(key, {
        key,
        ownerId,
        notebookId,
        kind,
        jobId,
        status: initialStatus ?? previous?.status ?? "queued",
        error: initialError ?? previous?.error ?? null,
        trackedAt: previous?.trackedAt ?? now,
        updatedAt: now,
      });

      const label = generationKindLabels[kind];
      upsertToast(key, {
        variant: "loading",
        title: `Generando ${label}`,
      });

      flushStorage();
      return key;
    },
    [flushStorage, upsertToast],
  );

  const waitForJob = useCallback(async <TJob extends GenerationJobBase>(key: string) => {
    const current = jobsRef.current.get(key);
    if (!current) return null;

    if (current.status === "done" || current.status === "failed") {
      return (current.terminalPayload ?? {
        job_id: current.jobId,
        status: current.status,
        error: current.error,
      }) as TJob;
    }

    return new Promise<TJob | null>((resolve) => {
      const set = waitersRef.current.get(key) ?? new Set<Waiter>();
      set.add((payload) => resolve(payload as TJob | null));
      waitersRef.current.set(key, set);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      loadedForUserRef.current = null;
      clearAllJobs();
      return;
    }

    if (loadedForUserRef.current === user.id) {
      return;
    }

    loadedForUserRef.current = user.id;

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TrackedGenerationJob[];
      const next = new Map<string, TrackedGenerationJob>();
      for (const item of parsed) {
        if (item.ownerId !== user.id) continue;
        next.set(item.key, item);
        const label = generationKindLabels[item.kind];
        upsertToast(item.key, {
          variant: "loading",
          title: `Generando ${label}`,
        });
      }
      jobsRef.current = next;
      flushStorage();
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [clearAllJobs, flushStorage, upsertToast, user]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const activeJobs = Array.from(jobsRef.current.values());

      for (const job of activeJobs) {
        if (job.status === "done" || job.status === "failed") {
          continue;
        }

        if (now - job.trackedAt > POLL_TIMEOUT_MS) {
          finalizeJob(
            job.key,
            {
              job_id: job.jobId,
              status: "failed",
              error: "La generacion esta tardando mas de lo esperado.",
            },
            { notify: true },
          );
          continue;
        }

        if (inFlightRef.current.has(job.key)) {
          continue;
        }

        inFlightRef.current.add(job.key);

        void (async () => {
          try {
            const fetchStatus = getGenerationStatusFetcher(job.kind);
            const latest = await fetchStatus(job.notebookId, job.jobId);

            const current = jobsRef.current.get(job.key);
            if (!current) return;

            current.status = latest.status;
            current.error = latest.error ?? null;
            current.updatedAt = Date.now();
            if (latest.status === "done" || latest.status === "failed") {
              current.terminalPayload = latest;
              finalizeJob(job.key, latest, { notify: true });
            } else {
              jobsRef.current.set(job.key, current);
              flushStorage();
            }
          } catch (e) {
            const maybeApiError = e as { status?: number; message?: string };
            if (maybeApiError.status === 404) {
              finalizeJob(
                job.key,
                {
                  job_id: job.jobId,
                  status: "failed",
                  error:
                    maybeApiError.message ?? "No se encontro el estado del trabajo.",
                },
                { notify: true },
              );
            }
          } finally {
            inFlightRef.current.delete(job.key);
          }
        })();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [finalizeJob, flushStorage, user]);

  const value = useMemo(
    () => ({
      trackJob,
      waitForJob,
      clearAllJobs,
    }),
    [clearAllJobs, trackJob, waitForJob],
  );

  return (
    <GenerationMonitorContext.Provider value={value}>
      {children}
    </GenerationMonitorContext.Provider>
  );
}
