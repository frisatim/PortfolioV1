import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { feature } from 'topojson-client';
import { useTheme } from '../../context/ThemeContext';
import useGlobeSocket from '../../hooks/useGlobeSocket';

// ── Same TopoJSON source as the 3D globe ─────────
const TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

// ── Theme palettes (shared semantics with WorldMapHero) ──
const THEMES = {
  light: {
    ocean: '#DBEAFE',
    land: '#E8E0D4',
    border: '#D4C9BB',
    pinOwn: '#4F46E5',
    pinOther: '#F59E0B',
    ripple: '79, 70, 229',
    accent: '#4F46E5',
  },
  dark: {
    ocean: '#070D15',
    land: '#0F1922',
    border: '#1a2736',
    pinOwn: '#e2e8f0',
    pinOther: '#ffb04f',
    ripple: '56, 189, 248',
    accent: '#38BDF8',
  },
};

// ── Equirectangular projection: lat/lng → SVG x/y ──
// Maps longitude [-180,180] to [0, width] and latitude [90,-90] to [0, height]
const MAP_W = 800;
const MAP_H = 400;

function project(lng, lat) {
  const x = ((lng + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

// ── Convert GeoJSON polygon ring to SVG path string ──
function ringToPath(ring) {
  return ring
    .map(([lng, lat], i) => {
      const [x, y] = project(lng, lat);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('') + 'Z';
}

function featureToPath(geom) {
  if (!geom) return '';
  const polys =
    geom.type === 'MultiPolygon'
      ? geom.coordinates
      : geom.type === 'Polygon'
        ? [geom.coordinates]
        : [];
  return polys.map((poly) => poly.map(ringToPath).join(' ')).join(' ');
}

// ── Pin2D: animated pushpin with bounce + ripple ────
function Pin2D({ x, y, color, isNew, rippleRgb }) {
  return (
    <g className="pin-2d-group" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {/* Ripple circle — expands from pin base */}
      {isNew && (
        <circle
          cx={0}
          cy={0}
          r={4}
          fill="none"
          stroke={`rgba(${rippleRgb}, 0.6)`}
          strokeWidth={1.5}
          className="pin-ripple"
        />
      )}
      {/* Shadow — anchors pin to surface */}
      <ellipse cx={0} cy={1} rx={4} ry={1.5} fill="rgba(0,0,0,0.15)" />
      {/* Pin spike */}
      <line x1={0} y1={0} x2={0} y2={-10} stroke="#9CA3AF" strokeWidth={1.2} strokeLinecap="round" />
      {/* Pin head — dome */}
      <circle
        cx={0}
        cy={-13}
        r={4.5}
        fill={color}
        className={isNew ? 'pin-bounce' : ''}
        role="img"
        aria-label="Votre punaise"
      />
      {/* Highlight on dome */}
      <circle cx={-1.2} cy={-14.5} r={1.2} fill="rgba(255,255,255,0.35)" />
    </g>
  );
}

// ── Zoom / pan constants ─────────────────────────
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const DOUBLE_TAP_DELAY = 300; // ms

// ── Main mobile map component ───────────────────
const MobileMapView = () => {
  const svgRef = useRef(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPin, setNewPin] = useState(false);
  const { theme } = useTheme();
  const C = THEMES[theme];

  // ── Zoom / pan state ────────────────────────────
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAP_W, h: MAP_H });
  const gestureRef = useRef({
    isPanning: false,
    startDist: 0,
    startViewBox: null,
    startMid: null,
    lastTap: 0,
    startPt: null,
    moved: false,
  });

  const clampViewBox = useCallback((vb) => {
    const w = Math.max(MAP_W / MAX_ZOOM, Math.min(MAP_W, vb.w));
    const h = (w / MAP_W) * MAP_H;
    const x = Math.max(0, Math.min(MAP_W - w, vb.x));
    const y = Math.max(0, Math.min(MAP_H - h, vb.y));
    return { x, y, w, h };
  }, []);

  const { markersArray, markerCount, isConnected, placeMarker, userUUID } =
    useGlobeSocket();

  const hasOwnMarker = markersArray.some((m) => m.uuid === userUUID);

  // ── Load GeoJSON ──────────────────────────────
  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries);
        setCountries(fc.features);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Helper: client coords → SVG viewBox coords ──
  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  // ── Touch start: detect pinch vs single-finger ──
  const handleTouchStart = useCallback(
    (e) => {
      const g = gestureRef.current;
      g.moved = false;

      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        g.startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        g.startViewBox = { ...viewBox };
        const midClient = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
        g.startMid = clientToSvg(midClient.x, midClient.y);
        g.isPanning = false;
      } else if (e.touches.length === 1) {
        // Pan start (only when zoomed in)
        g.startPt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        g.startViewBox = { ...viewBox };
        g.isPanning = true;
      }
    },
    [viewBox, clientToSvg]
  );

  // ── Touch move: pinch-zoom or pan ───────────────
  const handleTouchMove = useCallback(
    (e) => {
      const g = gestureRef.current;

      if (e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (!g.startDist || !g.startViewBox) return;

        const scale = g.startDist / dist; // >1 = zoom out, <1 = zoom in
        const newW = g.startViewBox.w * scale;
        const newH = (newW / MAP_W) * MAP_H;

        // Keep the midpoint of the pinch stationary
        const mid = g.startMid;
        if (!mid) return;
        const newX = mid.x - (mid.x - g.startViewBox.x) * (newW / g.startViewBox.w);
        const newY = mid.y - (mid.y - g.startViewBox.y) * (newH / g.startViewBox.h);

        setViewBox(clampViewBox({ x: newX, y: newY, w: newW, h: newH }));
        g.moved = true;
      } else if (e.touches.length === 1 && g.isPanning && g.startPt) {
        const isZoomed = viewBox.w < MAP_W - 1;
        if (!isZoomed) return; // don't pan when fully zoomed out

        const dx = e.touches[0].clientX - g.startPt.x;
        const dy = e.touches[0].clientY - g.startPt.y;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;

        // Convert pixel drag to SVG units
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const svgDx = (dx / rect.width) * viewBox.w;
        const svgDy = (dy / rect.height) * viewBox.h;

        setViewBox(
          clampViewBox({
            ...g.startViewBox,
            x: g.startViewBox.x - svgDx,
            y: g.startViewBox.y - svgDy,
          })
        );
      }
    },
    [viewBox, clampViewBox]
  );

  // ── Touch end: place marker or double-tap zoom ──
  const handleTouchEnd = useCallback(
    (e) => {
      const g = gestureRef.current;

      // If it was a pinch or a drag, don't place a marker
      if (g.moved || e.touches.length > 0) {
        g.isPanning = false;
        return;
      }
      g.isPanning = false;

      const now = Date.now();
      const touch = e.changedTouches?.[0];
      if (!touch) return;

      // Double-tap to zoom in / reset
      if (now - g.lastTap < DOUBLE_TAP_DELAY) {
        g.lastTap = 0;
        if (viewBox.w < MAP_W - 1) {
          // Already zoomed → reset
          setViewBox({ x: 0, y: 0, w: MAP_W, h: MAP_H });
        } else {
          // Zoom in 2.5× centered on tap
          const svgPt = clientToSvg(touch.clientX, touch.clientY);
          if (!svgPt) return;
          const newW = MAP_W / 2.5;
          const newH = MAP_H / 2.5;
          setViewBox(
            clampViewBox({
              x: svgPt.x - newW / 2,
              y: svgPt.y - newH / 2,
              w: newW,
              h: newH,
            })
          );
        }
        return;
      }
      g.lastTap = now;

      // Single tap — wait to confirm it's not a double-tap, then place marker
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      setTimeout(() => {
        if (Date.now() - g.lastTap < DOUBLE_TAP_DELAY) return; // became a double-tap

        const svgPt = clientToSvg(clientX, clientY);
        if (!svgPt) return;
        const lng = (svgPt.x / MAP_W) * 360 - 180;
        const lat = 90 - (svgPt.y / MAP_H) * 180;
        if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return;

        setNewPin(true);
        placeMarker(lat, lng);
        setTimeout(() => setNewPin(false), 700);
      }, DOUBLE_TAP_DELAY + 50);
    },
    [viewBox, placeMarker, clientToSvg, clampViewBox]
  );

  // ── Click handler (desktop fallback) ────────────
  const handleClick = useCallback(
    (e) => {
      // Skip on touch devices — handled by touch events
      if (e.sourceCapability?.firesTouchEvents) return;

      const svgPt = clientToSvg(e.clientX, e.clientY);
      if (!svgPt) return;
      const lng = (svgPt.x / MAP_W) * 360 - 180;
      const lat = 90 - (svgPt.y / MAP_H) * 180;
      if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return;

      setNewPin(true);
      placeMarker(lat, lng);
      setTimeout(() => setNewPin(false), 700);
    },
    [placeMarker, clientToSvg]
  );

  // ── Keyboard placement (center of map) ────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        placeMarker(20, 0); // default center-ish placement
        setNewPin(true);
        setTimeout(() => setNewPin(false), 700);
      }
    },
    [placeMarker]
  );

  return (
    <section className="relative w-full h-screen overflow-hidden" style={{ background: C.ocean }}>
      {/* ─── Full-screen map background ──────────── */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-2 h-2 rounded-full bg-accent-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full touch-none select-none"
          style={{ background: C.ocean }}
          role="button"
          tabIndex={0}
          aria-label="Carte interactive — touchez pour placer votre punaise. Double-touchez pour zoomer."
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {/* Country polygons */}
          {countries.map((f, i) => (
            <path
              key={f.id || i}
              d={featureToPath(f.geometry)}
              fill={C.land}
              stroke={C.border}
              strokeWidth={0.3}
            />
          ))}

          {/* Other visitors' pins */}
          {markersArray
            .filter((m) => m.uuid !== userUUID)
            .map((m) => {
              const [px, py] = project(m.lng, m.lat);
              return (
                <Pin2D
                  key={m.uuid}
                  x={px}
                  y={py}
                  color={C.pinOther}
                  isNew={false}
                  rippleRgb={C.ripple}
                />
              );
            })}

          {/* Own pin */}
          {markersArray
            .filter((m) => m.uuid === userUUID)
            .map((m) => {
              const [px, py] = project(m.lng, m.lat);
              return (
                <Pin2D
                  key={m.uuid}
                  x={px}
                  y={py}
                  color={C.pinOwn}
                  isNew={newPin}
                  rippleRgb={C.ripple}
                />
              );
            })}
        </svg>
      )}

      {/* ─── Overlay UI (pointer-events-none so taps pass through to map) ── */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
        {/* Hero text */}
        <div className="flex flex-col items-center justify-center pt-24 pb-6 px-4">
          <motion.p
            className="text-accent-400 text-xs tracking-[0.3em] uppercase mb-3 font-mono drop-shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Global Network
          </motion.p>
          <motion.h1
            className="text-4xl font-display font-bold text-text-100 mb-3 text-center drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Tim Vignon
          </motion.h1>
          <motion.p
            className="text-base text-text-300 font-light text-center drop-shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Engineering Student — Cybersecurity &bull; AI &bull; DevOps
          </motion.p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Empty state hint */}
        <AnimatePresence>
          {!hasOwnMarker && !loading && (
            <motion.div
              className="text-center mb-4 px-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-text-300 text-sm font-mono drop-shadow-sm">
                Votre point manque à l'appel !
              </p>
              <p className="text-text-500 text-xs font-mono mt-1 drop-shadow-sm">
                Touchez la carte pour commencer. Pincez pour zoomer.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar: visitor counter */}
        <motion.div
          className="flex justify-center pb-8 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="pointer-events-auto bg-base-900/60 backdrop-blur-sm border border-accent-400/15 px-4 py-2 rounded-lg flex items-center gap-3">
            <p className="font-mono text-xs text-text-500">
              <span className="text-lg font-bold text-accent-400">
                {markerCount}
              </span>{' '}
              visitor{markerCount !== 1 ? 's' : ''} marked
            </p>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isConnected ? '#4ade80' : '#6b7280' }}
              title={isConnected ? 'Live' : 'Offline'}
            />
          </div>
        </motion.div>
      </div>

      {/* ─── Zoom reset button ───────────────────── */}
      <AnimatePresence>
        {viewBox.w < MAP_W - 1 && (
          <motion.button
            className="absolute top-6 right-4 z-20 bg-base-900/70 backdrop-blur-sm border border-accent-400/20 text-text-300 rounded-lg px-3 py-1.5 text-xs font-mono"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setViewBox({ x: 0, y: 0, w: MAP_W, h: MAP_H })}
            aria-label="Réinitialiser le zoom"
          >
            ✕ Reset zoom
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MobileMapView;
