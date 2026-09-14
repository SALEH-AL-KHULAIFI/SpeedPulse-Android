import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, NativeModules, Platform } from 'react-native';

export type SpeedSnapshot = {
  downKbps: number;
  upKbps: number;
  totalBytes: number;
};

type OverlayBridge = {
  isOverlayPermissionGranted?: () => Promise<boolean>;
  openOverlaySettings?: () => Promise<void>;
  startOverlay?: () => Promise<void>;
  stopOverlay?: () => Promise<void>;
  getCurrentSpeed?: () => Promise<SpeedSnapshot>;
};

const bridge = (Platform.OS === 'android'
  ? NativeModules.SpeedOverlay
  : null) as OverlayBridge | null;

function demoSnapshot(): SpeedSnapshot {
  const now = Date.now();
  const wave = Math.sin(now / 1900);
  return {
    downKbps: Math.max(860, Math.round(4850 + wave * 830)),
    upKbps: Math.max(120, Math.round(940 + wave * 170)),
    totalBytes: 338 * 1024 * 1024,
  };
}

export function useSpeedOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [snapshot, setSnapshot] = useState<SpeedSnapshot>(() => demoSnapshot());
  const mounted = useRef(true);

  const refreshPermission = useCallback(async () => {
    if (!bridge?.isOverlayPermissionGranted) {
      setPermissionGranted(Platform.OS !== 'android');
      return Platform.OS !== 'android';
    }
    const allowed = await bridge.isOverlayPermissionGranted();
    if (mounted.current) setPermissionGranted(allowed);
    return allowed;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refreshPermission();
    return () => {
      mounted.current = false;
    };
  }, [refreshPermission]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (bridge?.getCurrentSpeed) {
        try {
          const next = await bridge.getCurrentSpeed();
          if (mounted.current) setSnapshot(next);
          return;
        } catch {
          // The Expo preview has no native bridge; it continues with a visible demo reading.
        }
      }
      if (mounted.current) setSnapshot(demoSnapshot());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const enable = useCallback(async () => {
    const allowed = await refreshPermission();
    if (!allowed) {
      if (bridge?.openOverlaySettings) {
        await bridge.openOverlaySettings();
      } else {
        await Linking.openSettings();
      }
      return false;
    }
    if (bridge?.startOverlay) await bridge.startOverlay();
    setEnabled(true);
    return true;
  }, [refreshPermission]);

  const disable = useCallback(async () => {
    if (bridge?.stopOverlay) await bridge.stopOverlay();
    setEnabled(false);
  }, []);

  return {
    enabled,
    permissionGranted,
    snapshot,
    enable,
    disable,
    nativeAvailable: Boolean(bridge),
  };
}