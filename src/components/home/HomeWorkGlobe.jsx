import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import * as THREE from 'three';
import { Github, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPlaneMesh, disposePlaneMesh } from '../PlaneModel';
import { useTheme } from '../../context/ThemeContext';
import useScrollProgress from '../../hooks/useScrollProgress';
import useGlobeSocket from '../../hooks/useGlobeSocket';
import { globeProjects } from '../../data/globeProjectsData';
import '../GlobeProjects.css';

const TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const FLIGHT_DURATION = 2500;
const FLIGHT_ARC_ALT = 0.35;
const PLANE_SCALE = 1.6;
const TRAIL_SEGMENTS = 64;

const THEMES = {
  light: {
    countrySurface: '#E8E0D4',
    countrySide: '#D4C9BB',
    countryBorder: 'rgba(79, 70, 229, 0.12)',
    atmosphere: '#818CF8',
    ocean: '#DBEAFE',
    trail: 0x4f46e5,
    trailOpacity: 0.35,
    planeEmissive: 0x3730a3,
    visitorOwn: '#4F46E5',
    visitorOther: '#F59E0B',
    rippleRgb: '79, 70, 229',
  },
  dark: {
    countrySurface: '#0F1922',
    countrySide: '#0a0e14',
    countryBorder: 'rgba(56, 189, 248, 0.15)',
    atmosphere: '#38BDF8',
    ocean: '#070D15',
    trail: 0x38bdf8,
    trailOpacity: 0.4,
    planeEmissive: 0x1e3a5f,
    visitorOwn: '#E2E8F0',
    visitorOther: '#FFB04F',
    rippleRgb: '56, 189, 248',
  },
};

const RING_DURATION = 1800;

function buildArcInterpolator(globeInst, fromLL, toLL, altitudeFraction) {
  const s = globeInst.getCoords(fromLL.lat, fromLL.lng, 0);
  const e = globeInst.getCoords(toLL.lat, toLL.lng, 0);
  const startV = new THREE.Vector3(s.x, s.y, s.z);
  const endV = new THREE.Vector3(e.x, e.y, e.z);
  const globeR = startV.length();

  const startN = startV.clone().normalize();
  const endN = endV.clone().normalize();
  const omega = Math.acos(THREE.MathUtils.clamp(startN.dot(endN), -1, 1));
  const sinOmega = Math.sin(omega);

  return function getPoint(t) {
    let dir;
    if (omega < 0.001) {
      dir = startN.clone().lerp(endN, t).normalize();
    } else {
      const a = Math.sin((1 - t) * omega) / sinOmega;
      const b = Math.sin(t * omega) / sinOmega;
      dir = startN.clone().multiplyScalar(a).add(endN.clone().multiplyScalar(b));
    }
    const altScale = 1 + altitudeFraction * 4 * t * (1 - t);
    return dir.normalize().multiplyScalar(globeR * altScale);
  };
}

function lerpAngle(a, b, t) {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

const HomeWorkGlobe = ({ mode }) => {
  const globeRef = useRef(null);
  const planeRef = useRef(null);
  const trailRef = useRef(null);
  const flightRafRef = useRef(0);
  const trailFadeRafRef = useRef(0);
  const oceanMatRef = useRef(null);
  const fadeRafRef = useRef(0);

  const [countries, setCountries] = useState({ features: [] });
  const [loading, setLoading] = useState(true);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [visitorRings, setVisitorRings] = useState([]);
  const [focusMode, setFocusMode] = useState(false);

  const [visitorOpacity, setVisitorOpacity] = useState(mode === 'home' ? 1 : 0);
  const [projectOpacity, setProjectOpacity] = useState(mode === 'work' ? 1 : 0);

  const visitorOpacityRef = useRef(visitorOpacity);
  const projectOpacityRef = useRef(projectOpacity);

  const { scrollY } = useScrollProgress();
  const { theme } = useTheme();
  const COLORS = THEMES[theme];
  const activeProject = globeProjects[activeIndex];
  const isMobile = dims.w < 768;

  const { markersArray, markerCount, isConnected, placeMarker, userUUID } = useGlobeSocket();

  const enterFocus = useCallback(() => {
    if (mode !== 'home') return;
    setFocusMode(true);
  }, [mode]);

  const exitFocus = useCallback(() => {
    setFocusMode(false);
  }, []);

  if (!oceanMatRef.current) {
    oceanMatRef.current = new THREE.MeshPhongMaterial({ color: COLORS.ocean });
  }

  useEffect(() => {
    visitorOpacityRef.current = visitorOpacity;
  }, [visitorOpacity]);

  useEffect(() => {
    projectOpacityRef.current = projectOpacity;
  }, [projectOpacity]);

  useEffect(() => {
    if (oceanMatRef.current) {
      oceanMatRef.current.color.set(COLORS.ocean);
    }
    if (trailRef.current) {
      trailRef.current.material.color.set(COLORS.trail);
      trailRef.current.material.opacity = COLORS.trailOpacity;
    }
    if (planeRef.current) {
      planeRef.current.traverse((child) => {
        if (child.isMesh && child.material?.emissive) {
          child.material.emissive.set(COLORS.planeEmissive);
        }
      });
    }
  }, [COLORS]);

  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        setCountries(feature(topo, topo.objects.countries));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const measure = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (!globeRef.current || loading) return;
    const controls = globeRef.current.controls();
    if (!controls) return;

    if (mode === 'home') {
      if (focusMode) {
        controls.autoRotate = false;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enablePan = false;
        globeRef.current.pointOfView({ altitude: 1.65 }, 700);
      } else {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.38;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false;
        globeRef.current.pointOfView({ lat: 35, lng: 10, altitude: 2.2 }, 900);
      }
      return;
    }

    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;
    const p = globeProjects[activeIndex] || globeProjects[0];
    globeRef.current.pointOfView({ lat: p.lat, lng: p.lng, altitude: 2.0 }, 900);
  }, [mode, loading, focusMode, activeIndex]);

  useEffect(() => {
    if (mode !== 'home') {
      setFocusMode(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!focusMode) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        exitFocus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, exitFocus]);

  useEffect(() => {
    document.body.style.overflow = focusMode ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [focusMode]);

  useEffect(() => {
    if (!globeRef.current || loading) return;

    const scene = globeRef.current.scene();

    const plane = createPlaneMesh(PLANE_SCALE);
    plane.visible = false;
    scene.add(plane);
    planeRef.current = plane;

    const trailGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_SEGMENTS * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const trailMat = new THREE.LineBasicMaterial({
      color: COLORS.trail,
      transparent: true,
      opacity: COLORS.trailOpacity,
      linewidth: 1,
    });

    const trail = new THREE.Line(trailGeom, trailMat);
    trail.visible = false;
    trail.frustumCulled = false;
    scene.add(trail);
    trailRef.current = trail;

    return () => {
      if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
      if (trailFadeRafRef.current) cancelAnimationFrame(trailFadeRafRef.current);

      scene.remove(plane);
      disposePlaneMesh(plane);
      scene.remove(trail);
      trailGeom.dispose();
      trailMat.dispose();

      planeRef.current = null;
      trailRef.current = null;
    };
  }, [loading]);

  useEffect(() => {
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);

    const fromVisitor = visitorOpacityRef.current;
    const toVisitor = mode === 'home' ? 1 : 0;
    const fromProject = projectOpacityRef.current;
    const toProject = mode === 'work' ? 1 : 0;
    const duration = 1150;
    const fadeInDelay = 150;
    const start = performance.now();

    const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

    const step = (now) => {
      const elapsed = now - start;

      const visitorDelay = toVisitor > fromVisitor ? fadeInDelay : 0;
      const projectDelay = toProject > fromProject ? fadeInDelay : 0;

      const visitorT = Math.min(Math.max((elapsed - visitorDelay) / (duration - visitorDelay), 0), 1);
      const projectT = Math.min(Math.max((elapsed - projectDelay) / (duration - projectDelay), 0), 1);

      setVisitorOpacity(fromVisitor + (toVisitor - fromVisitor) * ease(visitorT));
      setProjectOpacity(fromProject + (toProject - fromProject) * ease(projectT));

      if (Math.max(visitorT, projectT) < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = 0;
      }
    };

    fadeRafRef.current = requestAnimationFrame(step);

    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
      if (trailFadeRafRef.current) cancelAnimationFrame(trailFadeRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode === 'work') return;
    if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
    if (trailFadeRafRef.current) cancelAnimationFrame(trailFadeRafRef.current);
    if (planeRef.current) planeRef.current.visible = false;
    if (trailRef.current) trailRef.current.visible = false;
    setIsFlying(false);
    setFlyTarget(null);
  }, [mode]);

  const visitorPoints = useMemo(
    () =>
      markersArray.map((m) => ({
        kind: 'visitor',
        lat: m.lat,
        lng: m.lng,
        isOwn: m.uuid === userUUID,
      })),
    [markersArray, userUUID]
  );

  const projectPoints = useMemo(
    () =>
      globeProjects.map((p, i) => ({
        kind: 'project',
        id: p.id,
        index: i,
        lat: p.lat,
        lng: p.lng,
        color: p.color,
        isActive: i === activeIndex,
      })),
    [activeIndex]
  );

  const pointsData = useMemo(() => [...visitorPoints, ...projectPoints], [visitorPoints, projectPoints]);

  const workRing = useMemo(
    () =>
      activeProject
        ? [{ kind: 'project', lat: activeProject.lat, lng: activeProject.lng, color: activeProject.color }]
        : [],
    [activeProject]
  );

  const ringsData = useMemo(() => {
    const homeRings = visitorRings.map((r) => ({ ...r, kind: 'visitor' }));
    return [...homeRings, ...workRing];
  }, [visitorRings, workRing]);

  const navigateTo = useCallback(
    (index) => {
      if (mode !== 'work' || index === activeIndex || isFlying || !globeRef.current) return;

      const from = globeProjects[activeIndex];
      const to = globeProjects[index];

      if (prefersReducedMotion()) {
        setActiveIndex(index);
        globeRef.current.pointOfView({ lat: to.lat, lng: to.lng, altitude: 2.0 }, 800);
        return;
      }

      setIsFlying(true);
      setFlyTarget(to.city);

      const startLL = { lat: from.lat, lng: from.lng };
      const endLL = { lat: to.lat, lng: to.lng };
      const getArcPoint = buildArcInterpolator(globeRef.current, startLL, endLL, FLIGHT_ARC_ALT);

      const plane = planeRef.current;
      const trail = trailRef.current;
      if (plane) plane.visible = true;
      if (trail) {
        trail.visible = true;
        trail.material.color.set(COLORS.trail);
        trail.material.opacity = COLORS.trailOpacity;
      }

      if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
      if (trailFadeRafRef.current) cancelAnimationFrame(trailFadeRafRef.current);
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / FLIGHT_DURATION, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const pos = getArcPoint(eased);
        const posNext = getArcPoint(Math.min(eased + 0.01, 1));

        if (plane) {
          plane.position.copy(pos);

          const surfaceNormal = pos.clone().normalize();
          const rawForward = posNext.clone().sub(pos).normalize();
          const tangent = rawForward
            .clone()
            .sub(surfaceNormal.clone().multiplyScalar(rawForward.dot(surfaceNormal)))
            .normalize();

          const wingAxis = new THREE.Vector3()
            .crossVectors(tangent, surfaceNormal)
            .normalize();

          const rotMatrix = new THREE.Matrix4().makeBasis(tangent, surfaceNormal, wingAxis);
          plane.quaternion.setFromRotationMatrix(rotMatrix);
        }

        if (trail) {
          const posAttr = trail.geometry.getAttribute('position');
          const segCount = Math.max(2, Math.floor(eased * TRAIL_SEGMENTS));

          for (let i = 0; i < TRAIL_SEGMENTS; i++) {
            const segT = i < segCount ? (i / (segCount - 1)) * eased : eased;
            const p = getArcPoint(segT);
            posAttr.setXYZ(i, p.x, p.y, p.z);
          }

          posAttr.needsUpdate = true;
          trail.geometry.setDrawRange(0, segCount);
        }

        const camLat = startLL.lat + (endLL.lat - startLL.lat) * eased;
        const camLng = lerpAngle(startLL.lng, endLL.lng, eased);
        const camAlt = 2.0 + 0.5 * Math.sin(eased * Math.PI);
        globeRef.current?.pointOfView({ lat: camLat, lng: camLng, altitude: camAlt }, 0);

        if (t < 1) {
          flightRafRef.current = requestAnimationFrame(animate);
          return;
        }

        if (plane) plane.visible = false;

        if (trail) {
          const baseOpacity = COLORS.trailOpacity;
          const fadeStart = performance.now();
          const fadeDuration = 600;

          const fadeTrail = (now2) => {
            const ft = Math.min((now2 - fadeStart) / fadeDuration, 1);
            trail.material.opacity = baseOpacity * (1 - ft);
            if (ft < 1) {
              trailFadeRafRef.current = requestAnimationFrame(fadeTrail);
            } else {
              trail.visible = false;
              trail.material.opacity = baseOpacity;
              trailFadeRafRef.current = 0;
            }
          };

          trailFadeRafRef.current = requestAnimationFrame(fadeTrail);
        }

        setActiveIndex(index);
        setIsFlying(false);
        setFlyTarget(null);
        globeRef.current?.pointOfView({ lat: to.lat, lng: to.lng, altitude: 2.0 }, 600);
      };

      flightRafRef.current = requestAnimationFrame(animate);
    },
    [activeIndex, isFlying, mode, COLORS.trail, COLORS.trailOpacity]
  );

  const handlePointClick = useCallback(
    (d) => {
      if (mode === 'work' && d.kind === 'project') {
        navigateTo(d.index);
      }
    },
    [mode, navigateTo]
  );

  const handleGlobeClick = useCallback(
    ({ lat, lng }) => {
      if (mode !== 'home' || lat == null || lng == null) return;

      if (!focusMode) {
        enterFocus();
        return;
      }

      placeMarker(lat, lng);

      const id = Date.now();
      setVisitorRings((prev) => [...prev, { id, lat, lng }]);
      window.setTimeout(() => {
        setVisitorRings((prev) => prev.filter((r) => r.id !== id));
      }, RING_DURATION);
    },
    [mode, focusMode, placeMarker, enterFocus]
  );

  const handlePolygonClick = useCallback(
    (_polygon, _event, coords) => {
      if (mode !== 'home' || !coords) return;
      handleGlobeClick({ lat: coords.lat, lng: coords.lng });
    },
    [mode, handleGlobeClick]
  );

  const goPrev = useCallback(() => {
    navigateTo((activeIndex - 1 + globeProjects.length) % globeProjects.length);
  }, [activeIndex, navigateTo]);

  const goNext = useCallback(() => {
    navigateTo((activeIndex + 1) % globeProjects.length);
  }, [activeIndex, navigateTo]);

  const heroOpacity = mode === 'home' && !focusMode ? Math.max(0, 1 - scrollY / 500) * visitorOpacity : 0;
  const heroTranslate = mode === 'home' ? scrollY * 0.3 : -20;
  const showWorkUi = mode === 'work' && projectOpacity > 0.35;

  return (
    <section className="globe-projects" aria-label="Interactive globe">
      <AnimatePresence>
        {isFlying && flyTarget && showWorkUi && (
          <motion.div
            className="globe-projects__flying-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Flying to {flyTarget}...
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && dims.w > 0 && (
        <div
          className={`globe-projects__globe ${mode === 'work' ? 'globe-projects__globe--shifted' : ''}`}
          style={{ cursor: mode === 'home' ? (focusMode ? 'grab' : 'pointer') : 'default' }}
        >
          <Globe
            ref={globeRef}
            width={dims.w}
            height={dims.h}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={oceanMatRef.current}
            polygonsData={countries.features}
            polygonCapColor={() => COLORS.countrySurface}
            polygonSideColor={() => COLORS.countrySide}
            polygonStrokeColor={() => COLORS.countryBorder}
            polygonAltitude={0.008}
            pointsData={pointsData}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={(d) => (d.kind === 'project' ? 0.015 : 0.012)}
            pointRadius={(d) => {
              if (d.kind === 'project') return d.isActive ? 0.62 : 0.38;
              return d.isOwn ? 0.32 : 0.26;
            }}
            pointColor={(d) => {
              if (d.kind === 'visitor') {
                const alpha = (d.isOwn ? 0.95 : 0.8) * visitorOpacity;
                const color = d.isOwn ? COLORS.visitorOwn : COLORS.visitorOther;
                return `rgba(${hexToRgb(color)}, ${alpha})`;
              }

              const alpha = (d.isActive ? 1 : 0.7) * projectOpacity;
              return `rgba(${hexToRgb(d.color)}, ${alpha})`;
            }}
            onPointClick={handlePointClick}
            ringsData={ringsData}
            ringLat="lat"
            ringLng="lng"
            ringAltitude={0.015}
            ringColor={(d) => {
              if (d.kind === 'visitor') {
                return (t) => `rgba(${COLORS.rippleRgb}, ${(1 - t) * visitorOpacity})`;
              }
              return (t) => `rgba(${hexToRgb(d.color)}, ${(1 - t) * projectOpacity})`;
            }}
            ringMaxRadius={4}
            ringPropagationSpeed={2}
            ringRepeatPeriod={(d) => (d.kind === 'project' ? 900 : 0)}
            atmosphereColor={COLORS.atmosphere}
            atmosphereAltitude={mode === 'work' ? 0.15 : 0.12}
            onGlobeClick={handleGlobeClick}
            onPolygonClick={handlePolygonClick}
            enablePointerInteraction={mode === 'home' || mode === 'work'}
          />
        </div>
      )}

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-400)', animation: 'pulse 1.5s infinite' }} />
        </div>
      )}

      <AnimatePresence>
        {mode === 'home' && !focusMode && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            style={{ opacity: heroOpacity, transform: `translateY(${heroTranslate}px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: heroOpacity }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="text-accent-400 text-xs md:text-sm tracking-[0.3em] uppercase mb-4 font-mono"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7 }}
            >
              Global Network
            </motion.p>
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-text-100 mb-6 text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              Tim Vignon
            </motion.h1>
            <motion.p
              className="text-lg md:text-2xl text-text-300 font-light text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
            >
              Engineering Student &mdash; Cybersecurity &bull; AI &bull; DevOps
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mode === 'home' && !focusMode && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 * visitorOpacity }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs text-text-300 tracking-[0.2em] uppercase font-mono">
              Click the globe to leave your mark
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="z-10"
        style={{ position: 'absolute', bottom: 24, left: 24 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: mode === 'home' && !focusMode ? Math.max(0, visitorOpacity) : 0 }}
      >
        <div className="bg-base-900/60 backdrop-blur-sm border border-accent-400/15 px-5 py-3">
          <p className="font-mono text-xs text-text-500">
            <span className="text-xl font-bold text-accent-400 block">{markerCount}</span>
            visitor{markerCount !== 1 ? 's' : ''} marked
          </p>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mt-1.5"
            style={{ backgroundColor: isConnected ? '#4ADE80' : '#6B7280' }}
            title={isConnected ? 'Live' : 'Offline'}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {mode === 'home' && focusMode && (
          <motion.button
            onClick={exitFocus}
            className="fixed top-20 right-6 z-[10020] bg-base-800/90 hover:bg-base-700 text-text-100 w-10 h-10 rounded-full flex items-center justify-center border border-accent-400/20 backdrop-blur-sm cursor-pointer transition-colors"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Exit focus mode"
          >
            <X size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWorkUi && (
          <motion.div
            key={activeProject.id}
            className="globe-projects__card"
            initial={{ opacity: 0, x: -18, y: '-50%' }}
            animate={{ opacity: 1, x: 0, y: '-50%' }}
            exit={{ opacity: 0, x: -18, y: '-50%' }}
            transition={{ duration: 0.35 }}
          >
            <p className="globe-projects__card-city" style={{ color: activeProject.color }}>
              {activeProject.city}, {activeProject.country}
            </p>
            <h3 className="globe-projects__card-title">{activeProject.title}</h3>
            <p className="globe-projects__card-desc">{activeProject.description}</p>

            <div className="globe-projects__card-tags">
              {activeProject.tags.map((tag) => (
                <span key={tag} className="globe-projects__card-tag">
                  {tag}
                </span>
              ))}
            </div>

            <div className="globe-projects__card-links">
              {activeProject.github && (
                <a href={activeProject.github} target="_blank" rel="noopener noreferrer" className="globe-projects__card-link">
                  <Github size={14} /> GitHub
                </a>
              )}
              {activeProject.live && (
                <a href={activeProject.live} target="_blank" rel="noopener noreferrer" className="globe-projects__card-link">
                  <ExternalLink size={14} /> Live
                </a>
              )}
            </div>

            <div className="globe-projects__nav">
              <button className="globe-projects__nav-btn" onClick={goPrev} disabled={isFlying} aria-label="Previous project">
                <ChevronLeft size={18} />
              </button>
              <button className="globe-projects__nav-btn" onClick={goNext} disabled={isFlying} aria-label="Next project">
                <ChevronRight size={18} />
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-500)', alignSelf: 'center', marginLeft: '0.5rem' }}>
                {activeIndex + 1} / {globeProjects.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showWorkUi && !isMobile && (
        <div className="globe-projects__citybar">
          {globeProjects.map((p, i) => (
            <button
              key={p.id}
              className={`globe-projects__citybar-btn ${i === activeIndex ? 'globe-projects__citybar-btn--active' : ''}`}
              onClick={() => navigateTo(i)}
              disabled={isFlying}
              title={p.title}
              aria-label={`Go to project ${p.title}`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeWorkGlobe;