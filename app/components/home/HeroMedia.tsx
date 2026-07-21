import {useEffect, useRef, useState} from 'react';
import {prefersReducedMotion} from '~/lib/motion';

export interface HeroMediaProps {
  /** Poster still. Always rendered — it is the LCP element and the fallback. */
  poster: string;
  /** Optional loop. Omitted, and the poster stands alone. */
  video?: {src: string; type?: string};
  alt: string;
}

/**
 * Hero media — poster-first, video-second.
 *
 * The poster image ALWAYS renders and is what the browser paints for LCP. The
 * video mounts only after the poster has loaded and only when the visitor's
 * environment says it is welcome, then fades over the top. So:
 *
 *   · a failed/blocked/slow video is invisible — the poster simply stays
 *   · reduced motion never downloads the video at all
 *   · Save-Data never downloads the video at all
 *   · a 2g/slow-2g connection never downloads the video at all
 *   · the poster reserves the box, so there is no layout shift either way
 *
 * The video is decorative: muted, looping, inline, no controls, and
 * aria-hidden, because the poster's alt text already describes the scene.
 */
export function HeroMedia({poster, video, alt}: HeroMediaProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!video) return;
    if (prefersReducedMotion()) return;

    // Respect explicit data-saving and genuinely slow connections.
    const connection = (
      navigator as Navigator & {
        connection?: {saveData?: boolean; effectiveType?: string};
      }
    ).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /^(slow-)?2g$/.test(connection.effectiveType)) {
      return;
    }

    // Wait a tick past first paint so the poster wins the LCP race.
    const id = window.setTimeout(() => setShowVideo(true), 200);
    return () => window.clearTimeout(id);
  }, [video]);

  // Pause when off-screen or on a hidden tab — no work for something unseen.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !showVideo) return;

    const onVisibility = () => {
      if (document.hidden) el.pause();
      else void el.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      {threshold: 0.05},
    );
    observer.observe(el);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, [showVideo]);

  return (
    <div className="ng-heromedia">
      <img
        className="ng-heromedia-poster"
        src={poster}
        alt={alt}
        width={1280}
        height={720}
        loading="eager"
        // Hero art: fetch it ahead of everything else.
        fetchPriority="high"
        decoding="async"
      />

      {showVideo && video ? (
        <video
          ref={videoRef}
          className={`ng-heromedia-video${playing ? ' is-playing' : ''}`}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          // If it cannot play for any reason, stay hidden and leave the poster.
          onError={() => setShowVideo(false)}
        >
          <source src={video.src} type={video.type ?? 'video/mp4'} />
        </video>
      ) : null}
    </div>
  );
}
