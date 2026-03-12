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

// ── Main mobile map component ───────────────────
const MobileMapView = () => {
  const svgRef = useRef(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPin, setNewPin] = useState(false);
  const { theme } = useTheme();
  const C = THEMES[theme];

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

  // ── Handle tap on map ─────────────────────────
  const handleTap = useCallback(
    (e) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Get tap coordinates relative to SVG viewBox
      const pt = svg.createSVGPoint();
      const touch = e.changedTouches?.[0] || e;
      pt.x = touch.clientX;
      pt.y = touch.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

      // Convert SVG coords back to lat/lng
      const lng = (svgPt.x / MAP_W) * 360 - 180;
      const lat = 90 - (svgPt.y / MAP_H) * 180;

      // Clamp to valid range
      if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return;

      setNewPin(true);
      placeMarker(lat, lng);

      // Reset "new" flag after animation completes
      setTimeout(() => setNewPin(false), 700);
    },
    [placeMarker]
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
    <section className="relative w-full min-h-screen bg-base-950 flex flex-col">
      {/* ─── Hero text ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center pt-24 pb-6 px-4 z-10">
        <motion.p
          className="text-accent-400 text-xs tracking-[0.3em] uppercase mb-3 font-mono"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Global Network
        </motion.p>
        <motion.h1
          className="text-4xl font-display font-bold text-text-100 mb-3 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Tim Vignon
        </motion.h1>
        <motion.p
          className="text-base text-text-300 font-light text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Engineering Student — Cybersecurity &bull; AI &bull; DevOps
        </motion.p>
      </div>

      {/* ─── Map area ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 relative">
        {/* Empty state */}
        <AnimatePresence>
          {!hasOwnMarker && !loading && (
            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-text-300 text-sm font-mono">
                Votre point manque à l'appel !
              </p>
              <p className="text-text-500 text-xs font-mono mt-1">
                Touchez la carte pour commencer.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <motion.div
            className="w-2 h-2 rounded-full bg-accent-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="w-full max-w-[600px] rounded-xl overflow-hidden touch-none select-none"
            style={{
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
              background: C.ocean,
            }}
            role="button"
            tabIndex={0}
            aria-label="Carte interactive — touchez pour placer votre punaise"
            onTouchEnd={handleTap}
            onClick={handleTap}
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

        {/* Visitor counter */}
        <motion.div
          className="mt-4 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="bg-base-900/60 backdrop-blur-sm border border-accent-400/15 px-4 py-2 rounded-lg flex items-center gap-3">
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
    </section>
  );
};

export default MobileMapView;
