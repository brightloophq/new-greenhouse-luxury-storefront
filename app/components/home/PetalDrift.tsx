import {useEffect, useRef} from 'react';
import {prefersReducedMotion} from '~/lib/motion';

/**
 * Petals drifting slowly behind a section — the atmosphere the hero video gives
 * the top of the page, carried into the cream body below it.
 *
 * Canvas, not WebGL: a few dozen ellipses cost far less than a Three.js runtime
 * and read exactly the same at this scale. This is the answer to "should the
 * homepage have ambient motion" that does NOT involve a 150KB dependency.
 *
 * Scoped to its own section rather than fixed over the whole page, so it never
 * drifts across the hero video or the footer.
 *
 * Stops completely when it cannot be seen:
 *   · off-screen        → IntersectionObserver pauses the loop
 *   · hidden tab        → visibilitychange pauses the loop
 *   · reduced motion    → never starts, canvas never mounts work
 * and the loop is cancelled on unmount, so nothing survives a route change.
 */
export function PetalDrift({density = 16}: {
  /**
   * Petals per 1000px of section height, NOT a fixed total — the bays and the
   * gallery are very different heights, and a fixed count would leave the
   * taller one visibly emptier. Capped so an unusually long section cannot
   * turn this into a particle storm.
   */
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (prefersReducedMotion()) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Palette comes from the design tokens, so petals restyle with the brand
    // instead of hardcoding a second set of colours in JS.
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const palette = [
      token('--ng-green', '#4d6a50'),
      token('--ng-green-soft', '#7b8a78'),
      token('--ng-gold', '#c8a96a'),
    ];

    let width = 0;
    let height = 0;
    // Cap DPR: past 2 the extra pixels are invisible and the fill cost is real.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const makePetal = () => ({
      x: Math.random(),
      y: Math.random(),
      r: 4 + Math.random() * 7,
      // Wide speed spread, not a uniform rate: petals falling at visibly
      // different speeds read as depth, where one shared speed reads as a
      // texture scrolling past. Units are px/frame.
      speed: 0.55 + Math.random() * 0.85,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.006 + Math.random() * 0.01,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.014,
      alpha: 0.14 + Math.random() * 0.2,
      colour: palette[Math.floor(Math.random() * palette.length)],
    });

    const petals: ReturnType<typeof makePetal>[] = [];

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Grow or trim toward the density target rather than rebuilding, so a
      // resize never restarts every petal from a fresh random position.
      const target = Math.min(140, Math.round((height / 1000) * density));
      while (petals.length < target) petals.push(makePetal());
      if (petals.length > target) petals.length = target;
    }
    resize();

    const observerResize = new ResizeObserver(resize);
    observerResize.observe(canvas);

    let frame = 0;
    let running = false;

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of petals) {
        p.y += p.speed / height;
        p.sway += p.swaySpeed;
        p.rot += p.rotSpeed;
        if (p.y > 1.05) {
          p.y = -0.05;
          p.x = Math.random();
        }
        const x = p.x * width + Math.sin(p.sway) * 26;
        const y = p.y * height;

        ctx!.save();
        ctx!.translate(x, y);
        ctx!.rotate(p.rot);
        ctx!.globalAlpha = p.alpha;
        ctx!.fillStyle = p.colour;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, p.r, p.r * 0.52, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
      frame = requestAnimationFrame(draw);
    }

    function start() {
      if (running || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      {threshold: 0},
    );
    observer.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      observer.disconnect();
      observerResize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return <canvas ref={canvasRef} className="ng-petals" aria-hidden="true" />;
}
