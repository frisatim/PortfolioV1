import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import { X } from 'lucide-react';
import useScrollProgress from '../../hooks/useScrollProgress';

// ── Configuration ─────────────────────────────────
const TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const STORAGE_KEY = 'globe-guestbook-markers';
const MAX_MARKERS = 100;
const CLICK_COOLDOWN = 400;

const COLORS = {
  countrySurface: '#0F1922',
  countrySide: '#0a0e14',
  countryBorder: 'rgba(56, 189, 248, 0.15)',
  countryBorderFocus: 'rgba(56, 189, 248, 0.25)',
  marker: '#ffb04f',
  markerNew: '#ffffff',
  atmosphere: '#38BDF8',
};

// Spring transition for the globe resize
const GLOBE_SPRING = { type: 'spring', stiffness: 90, damping: 18, mass: 0.8 };

const WorldMapHero = () => {
  const globeRef = useRef();
  const lastClickTime = useRef(0);
  const sectionRef = useRef();

  const [countries, setCountries] = useState({ features: [] });
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [focusMode, setFocusMode] = useState(false);
  const { scrollY } = useScrollProgress();

  // ── Load GeoJSON ────────────────────────────────
  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        setCountries(feature(topo, topo.objects.countries));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Load / persist markers (localStorage) ───────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMarkers(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (markers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
    }
  }, [markers]);

  // ── Responsive sizing ───────────────────────────
  useEffect(() => {
    const measure = () => {
      setDims({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Configure globe controls after data loads ───
  useEffect(() => {
    if (!globeRef.current || loading) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI / 3.5;
      controls.maxPolarAngle = (2 * Math.PI) / 3;
    }
    globeRef.current.pointOfView({ lat: 40, lng: 10, altitude: 2.2 }, 0);
  }, [loading]);

  // ── Focus mode: ESC to exit ─────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && focusMode) exitFocus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  // ── Focus mode: lock scroll ─────────────────────
  useEffect(() => {
    document.body.style.overflow = focusMode ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [focusMode]);

  // ── Focus mode: toggle controls ─────────────────
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (!controls) return;

    if (focusMode) {
      controls.autoRotate = false;
      controls.enableZoom = true;
    } else {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
    }
  }, [focusMode]);

  // ── Enter / exit focus ──────────────────────────
  const enterFocus = useCallback(() => {
    setFocusMode(true);
  }, []);

  const exitFocus = useCallback(() => {
    setFocusMode(false);
  }, []);

  // ── Place a marker at given coords ─────────────
  const placeMarker = useCallback((lat, lng) => {
    if (lat == null || lng == null) return;
    const now = Date.now();
    if (now - lastClickTime.current < CLICK_COOLDOWN) return;
    lastClickTime.current = now;

    const marker = { id: `m-${now}`, lat, lng, ts: now };
    setMarkers((prev) => {
      const next = [...prev, marker];
      return next.length > MAX_MARKERS ? next.slice(-MAX_MARKERS) : next;
    });
  }, []);

  // ── Globe click (ocean): mode-aware ───────────
  const handleGlobeClick = useCallback(({ lat, lng }) => {
    if (!focusMode) {
      enterFocus();
      return;
    }
    placeMarker(lat, lng);
  }, [focusMode, enterFocus, placeMarker]);

  // ── Polygon click (countries): mode-aware ─────
  // onPolygonClick signature: (polygon, event, { lat, lng, altitude })
  const handlePolygonClick = useCallback((_polygon, _event, coords) => {
    if (!focusMode) {
      enterFocus();
      return;
    }
    placeMarker(coords.lat, coords.lng);
  }, [focusMode, enterFocus, placeMarker]);

  // ── Derived values ──────────────────────────────
  const heroOpacity = focusMode ? 0 : Math.max(0, 1 - scrollY / 500);
  const heroTranslate = focusMode ? -40 : scrollY * 0.3;

  // Globe always fills the container — no CSS scale transforms
  const globeW = dims.w;
  const globeH = dims.h;

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-base-950">

      {/* ─── Backdrop (focus mode) ──────────────── */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            className="fixed inset-0 bg-base-950 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      {/* ─── Globe container — no CSS transforms to avoid raycasting offset ── */}
      {!loading && dims.w > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            cursor: focusMode ? 'crosshair' : 'pointer',
            zIndex: focusMode ? 45 : 5,
          }}
        >
          <Globe
            ref={globeRef}
            width={globeW}
            height={globeH}
            backgroundColor="rgba(0,0,0,0)"
            // Country polygons
            polygonsData={countries.features}
            polygonCapColor={() => COLORS.countrySurface}
            polygonSideColor={() => COLORS.countrySide}
            polygonStrokeColor={() =>
              focusMode ? COLORS.countryBorderFocus : COLORS.countryBorder
            }
            polygonAltitude={0.008}
            // Markers
            pointsData={markers}
            pointLat="lat"
            pointLng="lng"
            pointColor={(d) =>
              Date.now() - d.ts < 1000 ? COLORS.markerNew : COLORS.marker
            }
            pointAltitude={0.02}
            pointRadius={(d) => (Date.now() - d.ts < 1000 ? 0.7 : 0.45)}
            // Atmosphere — brighter in focus
            atmosphereColor={COLORS.atmosphere}
            atmosphereAltitude={focusMode ? 0.2 : 0.12}
            // Interaction — onGlobeClick fires on oceans, onPolygonClick on countries
            onGlobeClick={handleGlobeClick}
            onPolygonClick={handlePolygonClick}
          />
        </div>
      )}

      {/* ─── Loading pulse ─────────────────────── */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-2 h-2 rounded-full bg-accent-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      )}

      {/* ─── Hero text (normal mode only) ──────── */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            style={{ transform: `translateY(${heroTranslate}px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: heroOpacity }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            <motion.p
              className="text-accent-400 text-xs md:text-sm tracking-[0.3em] uppercase mb-4 font-mono"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Global Network
            </motion.p>
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-text-100 mb-6 text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Tim Vignon
            </motion.h1>
            <motion.p
              className="text-lg md:text-2xl text-text-300 font-light text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              Engineering Student &mdash; Cybersecurity &bull; AI &bull; DevOps
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Focus mode instruction ────────────── */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <div className="bg-base-900/90 backdrop-blur-md border border-amber-500/25 px-6 py-3 rounded-full">
              <p className="text-amber-400/90 text-sm font-medium flex items-center gap-2 font-mono tracking-wide">
                Click anywhere to place your mark
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Close button (focus mode) ─────────── */}
      <AnimatePresence>
        {focusMode && (
          <motion.button
            onClick={exitFocus}
            className="fixed top-6 right-6 z-50 bg-base-800/90 hover:bg-base-700 text-text-100 w-11 h-11 rounded-full flex items-center justify-center border border-accent-400/20 backdrop-blur-sm cursor-pointer transition-colors"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Exit focus mode"
          >
            <X size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── ESC hint (focus mode) ─────────────── */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="bg-base-800/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-accent-400/10">
              <p className="text-text-500 text-[11px] font-mono">
                Press{' '}
                <kbd className="px-1.5 py-0.5 bg-base-700 rounded text-text-300 text-[10px]">
                  ESC
                </kbd>{' '}
                to exit
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Visitor counter (visible when > 0) ──── */}
      <AnimatePresence>
        {markers.length > 0 && (
          <motion.div
            className="z-50"
            style={{ position: focusMode ? 'fixed' : 'absolute' }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              bottom: focusMode ? 24 : 32,
              left: focusMode ? 24 : 24,
              scale: focusMode ? 0.9 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ delay: focusMode ? 0 : 1.2, duration: 0.4 }}
          >
            <div className="bg-base-900/60 backdrop-blur-sm border border-accent-400/15 px-5 py-3">
              <p className="font-mono text-xs text-text-500">
                <span className="text-xl font-bold text-accent-400 block">{markers.length}</span>
                visitor{markers.length !== 1 ? 's' : ''} marked
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Normal mode: bottom bar ───────────── */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.4 }}
          >
            <p className="text-xs text-text-300 tracking-[0.2em] uppercase font-mono">
              Click the globe to leave your mark
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Scroll indicator (normal mode) ────── */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            className="absolute bottom-8 right-6 md:right-8 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
          >
            <motion.div
              className="w-px h-10 bg-accent-400/40 mx-auto"
              animate={{ scaleY: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="text-[10px] text-text-500 tracking-[0.2em] uppercase mt-2 font-mono">
              Scroll
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default WorldMapHero;
