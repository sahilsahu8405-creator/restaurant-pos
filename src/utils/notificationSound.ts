/**
 * RestoHub Real-Time Notification & Audio Synthesizer Service
 * 
 * High-performance Web Audio API sound synthesis with zero external audio assets.
 * Instant sub-millisecond playback with browser autoplay policy resilience,
 * cross-tab BroadcastChannel communication, and native browser OS notification integration.
 */

import { KitchenNotification, KOTTicket } from '../types';

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Audio Preference Key
const SOUND_ENABLED_KEY = 'restohub_sound_enabled';

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('restohub:sound-setting-changed', { detail: { enabled } }));
  }
}

/**
 * Initializes and resumes Web Audio Context on the first user interaction.
 * Crucial for overcoming modern browser autoplay restrictions on Chrome, iOS Safari, Android, Edge.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }

  return sharedAudioCtx;
}

// Auto-unlock AudioContext on first user interaction anywhere on the window
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (isAudioUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
      }
    }
    // Remove listeners once unlocked
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true, once: false });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: false });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: false });
}

/**
 * Pleasant two-tone rising chime (D5 -> A5)
 * Played when Kitchen marks a dish or ticket ready for waiters to pick up.
 */
export function playFoodReadyChime(): void {
  if (!isNotificationSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Tone 1: D5 (587.33 Hz)
    osc.frequency.setValueAtTime(587.33, now);
    // Tone 2: A5 (880 Hz) - rising cadence
    osc.frequency.setValueAtTime(880, now + 0.12);

    // Smooth envelope with exponential decay
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch {
    // Graceful no-op if audio context fails
  }
}

/**
 * Attention-grabbing double kitchen alert chime (C5 -> E5 -> G5)
 * Played in KDS terminal when a waiter fires a new KOT ticket.
 */
export function playNewTicketChime(): void {
  if (!isNotificationSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch {
    // Graceful no-op
  }
}

/**
 * Soft confirmation chime when food is served or bill settled.
 */
export function playOrderServedChime(): void {
  if (!isNotificationSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(523.25, now + 0.12); // C5

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Graceful no-op
  }
}

/**
 * Native Browser Desktop / Mobile Notification Support
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } catch {
      // Ignored if background worker required
    }
  }
}

/**
 * Cross-Tab Broadcast Channel (Web Standard)
 * Enables sub-millisecond communication across multiple browser tabs/windows
 * on the same computer without hitting Supabase network roundtrips.
 */
type RestoHubBroadcastMessage =
  | { type: 'FOOD_READY'; outletId?: string; notification: KitchenNotification }
  | { type: 'NEW_KOT_TICKETS'; outletId?: string; tickets: KOTTicket[]; orderId?: string }
  | { type: 'ORDER_UPDATED'; outletId?: string; orderId?: string }
  | { type: 'NOTIFICATION_SERVED'; outletId?: string; notificationId: string };

let broadcastChannelInstance: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel('restohub_realtime_events');
    } catch {
      return null;
    }
  }
  return broadcastChannelInstance;
}

export function postCrossTabEvent(message: RestoHubBroadcastMessage): void {
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage(message);
    }
  } catch {
    // Fallback handled by localStorage storage event
  }
}

export function subscribeToCrossTabEvents(
  handler: (message: RestoHubBroadcastMessage) => void
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) return () => {};

  const listener = (event: MessageEvent<RestoHubBroadcastMessage>) => {
    if (event && event.data) {
      handler(event.data);
    }
  };

  channel.addEventListener('message', listener);
  return () => {
    channel.removeEventListener('message', listener);
  };
}
