'use client';

import { Clock3, FileQuestion, ImageIcon, ImageOff } from 'lucide-react';
import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { displayMediaURL } from '@/lib/mediaUrl';

export type MediaFrameStatus = 'loading' | 'ready' | 'broken' | 'expired' | 'unsupported' | 'empty';
type MediaFrameFit = 'contain' | 'cover';

type MediaFrameProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & Readonly<{
  status?: MediaFrameStatus;
  mediaType?: 'image' | 'video';
  src?: string;
  alt?: string;
  poster?: string;
  fit?: MediaFrameFit;
  aspectRatio?: CSSProperties['aspectRatio'];
  actions?: ReactNode;
  controls?: boolean;
  muted?: boolean;
  stateLabel?: string;
  stateDescription?: string;
  onMediaError?: () => void;
}>;

const DEFAULT_STATE_COPY: Record<Exclude<MediaFrameStatus, 'ready'>, Readonly<{ label: string; description: string }>> = {
  loading: { label: 'Loading media', description: 'The preview will appear when it is ready.' },
  broken: { label: 'Preview unavailable', description: 'The media could not be loaded.' },
  expired: { label: 'Media expired', description: 'Generate or upload the media again to continue.' },
  unsupported: { label: 'Unsupported media', description: 'This file type cannot be previewed here.' },
  empty: { label: 'No media yet', description: 'Generated or uploaded media will appear here.' },
};

export function MediaFrame({
  status = 'ready',
  mediaType = 'image',
  src,
  alt = '',
  poster,
  fit = 'contain',
  aspectRatio = '1 / 1',
  actions,
  controls = true,
  muted = false,
  stateLabel,
  stateDescription,
  onMediaError,
  className = '',
  ...props
}: MediaFrameProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const sourceKey = src ? `${mediaType}:${src}` : undefined;
  const sourceFailed = Boolean(sourceKey && failedSource === sourceKey);
  const resolvedStatus = status === 'ready'
    ? (!src ? 'empty' : sourceFailed ? 'broken' : 'ready')
    : status;
  const handleError = () => {
    setFailedSource(sourceKey);
    onMediaError?.();
  };

  return (
    <div {...props} className={`min-w-0 overflow-hidden rounded-surface border border-line bg-surface shadow-surface ${className}`}>
      <div className="relative grid min-h-32 place-items-center overflow-hidden bg-subtle" style={{ aspectRatio }}>
        <MediaContent
          status={resolvedStatus}
          mediaType={mediaType}
          src={src}
          alt={alt}
          poster={poster}
          fit={fit}
          controls={controls}
          muted={muted}
          stateLabel={stateLabel}
          stateDescription={stateDescription}
          onError={handleError}
        />
      </div>
      {actions ? <div className="flex min-h-11 items-center justify-end gap-2 border-t border-line bg-surface px-2.5 py-1.5">{actions}</div> : null}
    </div>
  );
}

function MediaContent({
  status,
  mediaType,
  src,
  alt,
  poster,
  fit,
  controls,
  muted,
  stateLabel,
  stateDescription,
  onError,
}: Readonly<{
  status: MediaFrameStatus;
  mediaType: 'image' | 'video';
  src?: string;
  alt: string;
  poster?: string;
  fit: MediaFrameFit;
  controls: boolean;
  muted: boolean;
  stateLabel?: string;
  stateDescription?: string;
  onError: () => void;
}>) {
  if (status !== 'ready' || !src) {
    return <MediaState status={status === 'ready' ? 'empty' : status} label={stateLabel} description={stateDescription} />;
  }
  const displayURL = displayMediaURL(src);
  const displayPoster = displayMediaURL(poster);
  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain';
  if (mediaType === 'video') {
    return (
      <video
        src={displayURL}
        poster={displayPoster}
        controls={controls}
        muted={muted}
        preload="metadata"
        aria-label={alt || 'Video preview'}
        className={`size-full ${fitClass}`}
        onError={onError}
      />
    );
  }
  // Runtime and object URLs cannot reliably use the Next.js image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displayURL} alt={alt} draggable={false} className={`size-full ${fitClass}`} onError={onError} />;
}

function MediaState({ status, label, description }: Readonly<{
  status: Exclude<MediaFrameStatus, 'ready'>;
  label?: string;
  description?: string;
}>) {
  const copy = DEFAULT_STATE_COPY[status];
  if (status === 'loading') {
    return (
      <div className="size-full animate-pulse p-4 motion-reduce:animate-none" role="status" aria-label={label ?? copy.label}>
        <div className="size-full rounded-control bg-line" />
      </div>
    );
  }
  const icons = {
    empty: ImageIcon,
    broken: ImageOff,
    expired: Clock3,
    unsupported: FileQuestion,
  };
  const Icon = icons[status];
  return (
    <div className="flex max-w-sm flex-col items-center px-5 py-6 text-center" role="img" aria-label={label ?? copy.label}>
      <Icon size={24} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
      <strong className="mt-2 text-sm text-ink">{label ?? copy.label}</strong>
      <span className="mt-1 text-xs leading-5 text-muted">{description ?? copy.description}</span>
    </div>
  );
}
