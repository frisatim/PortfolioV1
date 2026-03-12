import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import { X } from 'lucide-react';
import * as THREE from 'three';
import useScrollProgress from '../../hooks/useScrollProgress';
import useGlobeSocket from '../../hooks/useGlobeSocket';
import { useTheme } from '../../context/ThemeContext';
import { createPushPin, animatePinBounce, disposePushPin } from './createPushPin';

// ── Configuration ─────────────────────────────────
const TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const CLICK_COOLDOWN = 400;
const GLOBE_RADIUS = 100;
const POLYGON_ALT = 0.008;
const SURFACE_RADIUS = GLOBE_RADIUS * (1 + POLYGON_ALT); // effective surface with countries
const RING_DURATION = 1800;

const THEMES = {
  light: {
    countrySurface: '#E8E0D4',
    countrySide: '#D4C9BB',
    countryBorder: 'rgba(79, 70, 229, 0.12)',
    countryBorderFocus: 'rgba(79, 70, 229, 0.25)',
    pinOwn: '#4F46E5',
    pinOther: '#F59E0B',
    pinGhost: '#4F46E5',
    atmosphere: '#818CF8',
    rippleRgb: '79, 70, 229',
    ocean: '#DBEAFE',
  },
  dark: {
    countrySurface: '#0F1922',
    countrySide: '#0a0e14',
    countryBorder: 'rgba(56, 189, 248, 0.15)',
    countryBorderFocus: 'rgba(56, 189, 248, 0.25)',
    pinOwn: '#e2e8f0',
    pinOther: '#ffb04f',
    pinGhost: '#38BDF8',
    atmosphere: '#38BDF8',
    rippleRgb: '56, 189, 248',
    ocean: '#070D15',
  },
};

const WorldMapHero = () => {
  const globeRef = useRef();
  const lastClickTime = useRef(0);
  const sectionRef = useRef();
  const ghostPinRef = useRef(null);
  const justPlacedRef = useRef(false);
  const rafRef = useRef(0);
  const pinRefsMap = useRef(new Map());
  const oceanMatRef = useRef(new THREE.MeshPhongMaterial({ color: '#DBEAFE' }));

  const [countries, setCountries] = useState({ features: [] });
  const [loading, setLoading] = useState(true);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [focusMode, setFocusMode] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [ringsData, setRingsData] = useState([]);
  const { scrollY } = useScrollProgress();
  const { theme } = useTheme();

  const COLORS = THEMES[theme];

  const { markersArray, markerCount, isConnected, placeMarker, userUUID } =
    useGlobeSocket();

  // ── Update 3D materials on theme change ────────
  useEffect(() => {
    // Ocean material
    oceanMatRef.current.color.set(COLORS.ocean);

    // Existing pins
    pinRefsMap.current.forEach((pin, uuid) => {
      const isOwn = uuid === userUUID;
      const color = isOwn ? COLORS.pinOwn : COLORS.pinOther;
      const inner = pin.children[0]; // inner group
      if (inner) {
        const head = inner.children[0]; // head mesh
        if (head?.material) head.material.color.set(color);
      }
    });

    // Ghost pin
    if (ghostPinRef.current) {
      const inner = ghostPinRef.current.children[0];
      if (inner) {
        const head = inner.children[0];
        if (head?.material) head.material.color.set(COLORS.pinGhost);
      }
    }
  }, [theme, COLORS, userUUID]);

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

  // ── Ghost pin: create and add to Three.js scene ─
  useEffect(() => {
    if (!globeRef.current || loading) return;

    const colors = THEMES[document.documentElement.getAttribute('data-theme') || 'light'];
    const ghost = createPushPin({
      color: colors.pinGhost,
      opacity: 0.35,
      scale: 0.85,
    });
    ghost.visible = false;
    ghost.renderOrder = 999;

    const scene = globeRef.current.scene();
    scene.add(ghost);
    ghostPinRef.current = ghost;

    return () => {
      scene.remove(ghost);
      disposePushPin(ghost);
      ghostPinRef.current = null;
    };
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [focusMode]);

  // ── Focus mode: toggle controls + ghost visibility
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
      // Reset camera to default altitude with smooth transition
      globeRef.current.pointOfView({ altitude: 2.2 }, 800);
      if (ghostPinRef.current) ghostPinRef.current.visible = false;
    }
  }, [focusMode]);

  // ── Enter / exit focus ──────────────────────────
  const enterFocus = useCallback(() => {
    setFocusMode(true);
  }, []);

  const exitFocus = useCallback(() => {
    setFocusMode(false);
    setIsHovering(false);
  }, []);

  // ── Place a marker at given coords ─────────────
  const handlePlaceMarker = useCallback(
    (lat, lng) => {
      if (lat == null || lng == null) return;
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_COOLDOWN) return;
      lastClickTime.current = now;

      justPlacedRef.current = true;
      placeMarker(lat, lng);

      // Add ripple ring on the globe surface
      const ringId = now;
      setRingsData((prev) => [...prev, { lat, lng, id: ringId }]);
      setTimeout(() => {
        setRingsData((prev) => prev.filter((r) => r.id !== ringId));
      }, RING_DURATION);
    },
    [placeMarker]
  );

  // ── Globe click (ocean): mode-aware ───────────
  const handleGlobeClick = useCallback(
    ({ lat, lng }) => {
      if (!focusMode) {
        enterFocus();
        return;
      }
      handlePlaceMarker(lat, lng);
    },
    [focusMode, enterFocus, handlePlaceMarker]
  );

  // ── Polygon click (countries): mode-aware ─────
  const handlePolygonClick = useCallback(
    (_polygon, _event, coords) => {
      if (!focusMode) {
        enterFocus();
        return;
      }
      handlePlaceMarker(coords.lat, coords.lng);
    },
    [focusMode, enterFocus, handlePlaceMarker]
  );

  // ── Ghost pin raycasting on mouse move ────────
  const handleMouseMoveGhost = useCallback(
    (e) => {
      if (!focusMode) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setMousePos({ x: mx, y: my });

      if (!globeRef.current || !ghostPinRef.current) return;

      // Throttle via rAF
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;

        const ndcX = (mx / rect.width) * 2 - 1;
        const ndcY = -(my / rect.height) * 2 + 1;

        const camera = globeRef.current.camera();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

        const sphere = new THREE.Sphere(
          new THREE.Vector3(0, 0, 0),
          SURFACE_RADIUS
        );
        const hit = new THREE.Vector3();

        if (raycaster.ray.intersectSphere(sphere, hit)) {
          const ghost = ghostPinRef.current;
          ghost.visible = true;

          // Surface normal (outward from sphere center)
          const normal = hit.clone().normalize();

          // Position ghost at hit point, slightly above polygon surface
          ghost.position.copy(hit).addScaledVector(normal, 0.3);

          // Orient Z+ along surface normal (matches objectFacesSurface convention)
          ghost.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            normal
          );

          setIsHovering(true);
        } else {
          ghostPinRef.current.visible = false;
          setIsHovering(false);
        }
      });
    },
    [focusMode]
  );

  // ── Object layer: 3D pushpin factory ──────────
  const objectThreeObject = useCallback(
    (d) => {
      const isOwn = d.uuid === userUUID;
      const colors = THEMES[document.documentElement.getAttribute('data-theme') || 'light'];
      const pin = createPushPin({
        color: isOwn ? colors.pinOwn : colors.pinOther,
        scale: isOwn ? 1 : 0.75,
      });

      // Track ref for live theme updates
      pinRefsMap.current.set(d.uuid, pin);

      // Bounce animation for freshly placed own pin
      if (isOwn && justPlacedRef.current) {
        justPlacedRef.current = false;
        animatePinBounce(pin);
      }

      return pin;
    },
    [userUUID]
  );

  // ── Derived values ──────────────────────────────
  const hasOwnMarker = markersArray.some((m) => m.uuid === userUUID);
  const heroOpacity = focusMode ? 0 : Math.max(0, 1 - scrollY / 500);
  const heroTranslate = focusMode ? -40 : scrollY * 0.3;

  const globeW = dims.w;
  const globeH = dims.h;

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-base-950"
    >
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

      {/* ─── Globe container ── */}
      {!loading && dims.w > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            cursor: focusMode ? 'crosshair' : 'pointer',
            zIndex: focusMode ? 45 : 5,
          }}
          onMouseMove={handleMouseMoveGhost}
          onMouseEnter={() => focusMode && setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            if (ghostPinRef.current) ghostPinRef.current.visible = false;
          }}
        >
          <Globe
            ref={globeRef}
            width={globeW}
            height={globeH}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={oceanMatRef.current}
            // ── Countries ──
            polygonsData={countries.features}
            polygonCapColor={() => COLORS.countrySurface}
            polygonSideColor={() => COLORS.countrySide}
            polygonStrokeColor={() =>
              focusMode ? COLORS.countryBorderFocus : COLORS.countryBorder
            }
            polygonAltitude={0.008}
            // ── 3D Pushpin markers ──
            objectsData={markersArray}
            objectLat="lat"
            objectLng="lng"
            objectAltitude={0.012}
            objectFacesSurface={true}
            objectThreeObject={objectThreeObject}
            // ── Ripple rings ──
            ringsData={ringsData}
            ringLat="lat"
            ringLng="lng"
            ringAltitude={0.011}
            ringColor={() => (t) => `rgba(${COLORS.rippleRgb}, ${1 - t})`}
            ringMaxRadius={5}
            ringPropagationSpeed={3}
            ringRepeatPeriod={0}
            // ── Atmosphere ──
            atmosphereColor={COLORS.atmosphere}
            atmosphereAltitude={focusMode ? 0.2 : 0.12}
            // ── Events ──
            onGlobeClick={handleGlobeClick}
            onPolygonClick={handlePolygonClick}
          />
        </div>
      )}

      {/* ─── Empty State (focus mode, no own marker) ── */}
      <AnimatePresence>
        {focusMode && !hasOwnMarker && !isHovering && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div
              className="px-8 py-6 rounded-2xl text-center"
              style={{
                border: '2px dashed rgba(79, 70, 229, 0.4)',
                animation: 'pulse-border 2s ease-in-out infinite',
              }}
            >
              <p className="text-text-300 text-sm font-mono">
                Votre point manque à l'appel !
              </p>
              <p className="text-text-500 text-xs font-mono mt-1">
                Cliquez n'importe où pour commencer.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ghost Pin tooltip (cursor follower) ── */}
      {focusMode && isHovering && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: 'translate(-50%, -140%)',
          }}
        >
          <span className="whitespace-nowrap text-[10px] text-text-300 font-mono bg-base-900/80 backdrop-blur-sm px-2 py-1 rounded border border-accent-400/20">
            Cliquez pour placer
          </span>
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
            <div className="bg-base-900/90 backdrop-blur-md border border-indigo-500/25 px-6 py-3 rounded-full">
              <p className="text-indigo-600 text-sm font-medium flex items-center gap-2 font-mono tracking-wide">
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

      {/* ─── Visitor counter + connection indicator ──── */}
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
        transition={{ delay: focusMode ? 0 : 1.2, duration: 0.4 }}
      >
        <div className="bg-base-900/60 backdrop-blur-sm border border-accent-400/15 px-5 py-3">
          <p className="font-mono text-xs text-text-500">
            <span className="text-xl font-bold text-accent-400 block">
              {markerCount}
            </span>
            visitor{markerCount !== 1 ? 's' : ''} marked
          </p>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mt-1.5"
            style={{ backgroundColor: isConnected ? '#4ade80' : '#6b7280' }}
            title={isConnected ? 'Live' : 'Offline'}
          />
        </div>
      </motion.div>

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
