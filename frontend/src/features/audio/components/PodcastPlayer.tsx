import {
  Download,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { formatTime } from "../utils/formatTime";

type Props = {
  audioUrl: string;
  title: string;
  description?: string;
  initialDuration?: number;
  menuSlot?: React.ReactNode;
};

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;

export function PodcastPlayer({ audioUrl, title, description, initialDuration, menuSlot }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState<number>(initialDuration ?? 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [rate, setRate] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<{ url: string; initialDuration: number | undefined }>(
    { url: audioUrl, initialDuration },
  );

  if (lastSource.url !== audioUrl || lastSource.initialDuration !== initialDuration) {
    setLastSource({ url: audioUrl, initialDuration });
    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTime(0);
    setRate(1);
    setErrorMessage(null);
    setDuration(initialDuration ?? 0);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
    setIsLoading(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback(() => {
    setErrorMessage("No se pudo cargar el audio.");
    setIsLoading(false);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => {
        setErrorMessage("No se pudo reproducir el audio.");
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
    }
  }, [isPlaying]);

  const cycleRate = useCallback(() => {
    setRate((current) => {
      const idx = PLAYBACK_RATES.indexOf(current as (typeof PLAYBACK_RATES)[number]);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      return next;
    });
  }, []);

  const handleSeek = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(duration) || duration <= 0) return;
      const target = Number(event.target.value);
      audio.currentTime = target;
      setCurrentTime(target);
    },
    [duration],
  );

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        className="hidden"
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading || Boolean(errorMessage)}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
          className={cn(
            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition",
            "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            (isLoading || errorMessage) && "cursor-not-allowed opacity-60",
          )}
        >
          {isLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground" title={title}>
              {title}
            </p>
            {menuSlot}
          </div>
          {description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs leading-none tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1">
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                disabled={isLoading || duration <= 0}
                aria-label="Posicion del audio"
                className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent opacity-0"
              />
            </div>
            <span className="shrink-0 w-10 text-xs leading-none tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={restart}
                disabled={isLoading}
                aria-label="Reiniciar"
                title="Reiniciar"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
              <button
                type="button"
                onClick={cycleRate}
                aria-label={`Velocidad ${rate}x`}
                title="Cambiar velocidad"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Gauge className="h-3.5 w-3.5" />
                {rate}x
              </button>
              <a
                href={audioUrl}
                download
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </a>
            </div>
          </div>
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
