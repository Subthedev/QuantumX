/**
 * Sound Notifications for Trading Events
 * Provides audio feedback for order fills, alerts, and other trading events
 */

export type SoundType = 'order_buy' | 'order_sell' | 'order_filled' | 'price_alert' | 'error' | 'arena_big_win' | 'arena_small_win' | 'arena_loss';

class SoundNotificationManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initializeSounds();
    this.loadPreferences();
  }

  private initializeSounds() {
    // Using Web Audio API to generate synthetic sounds
    // This avoids needing to host audio files
    
    // For now, we'll use data URLs for simple beep sounds
    // In production, you'd use actual audio files
    
    const createBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(this.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      return audioContext;
    };

    // Create sound effects using oscillators
    this.sounds.set('order_buy', this.createAudioElement('buy'));
    this.sounds.set('order_sell', this.createAudioElement('sell'));
    this.sounds.set('order_filled', this.createAudioElement('filled'));
    this.sounds.set('price_alert', this.createAudioElement('alert'));
    this.sounds.set('error', this.createAudioElement('error'));

    // ✅ ARENA SOUNDS: Position close notifications
    this.sounds.set('arena_big_win', this.createAudioElement('arena_big_win'));
    this.sounds.set('arena_small_win', this.createAudioElement('arena_small_win'));
    this.sounds.set('arena_loss', this.createAudioElement('arena_loss'));
  }

  private createAudioElement(type: string): HTMLAudioElement {
    const audio = new Audio();
    audio.volume = this.volume;
    
    // For demonstration, we'll use system sounds via data URLs
    // In production, replace with actual audio files
    switch (type) {
      case 'buy':
        // Higher pitch for buy - success sound
        this.generateTone(audio, [800, 1000], 0.15);
        break;
      case 'sell':
        // Lower pitch for sell
        this.generateTone(audio, [600, 400], 0.15);
        break;
      case 'filled':
        // Triple beep for order filled
        this.generateTone(audio, [800, 1000, 1200], 0.1);
        break;
      case 'alert':
        // Alert sound - attention grabbing
        this.generateTone(audio, [1200, 900, 1200], 0.12);
        break;
      case 'error':
        // Error sound - lower and longer
        this.generateTone(audio, [400, 300], 0.2);
        break;
      case 'arena_big_win':
        // 🔥 BIG WIN - Triple ascending celebration
        this.generateTone(audio, [523, 659, 784], 0.15);
        break;
      case 'arena_small_win':
        // ✅ SMALL WIN - Double ascending positive
        this.generateTone(audio, [523, 659], 0.12);
        break;
      case 'arena_loss':
        // 🛡️ LOSS - Single gentle tone (non-alarming)
        this.generateTone(audio, [392], 0.2);
        break;
    }
    
    return audio;
  }

  private generateTone(audio: HTMLAudioElement, frequencies: number[], noteDuration: number) {
    // This is a placeholder - in production use actual audio files
    // For now, we'll play system sounds
    const totalDuration = frequencies.length * noteDuration;
    audio.src = `data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=`;
  }

  private loadPreferences() {
    const savedEnabled = localStorage.getItem('trading_sounds_enabled');
    const savedVolume = localStorage.getItem('trading_sounds_volume');
    
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true';
    }
    
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
      this.updateVolume();
    }
  }

  private updateVolume() {
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  play(soundType: SoundType) {
    if (!this.enabled) return;

    try {
      const sound = this.sounds.get(soundType);
      if (sound) {
        // Reset and play
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.warn('Failed to play sound:', error);
        });
      } else {
        // Fallback: play a system beep using Web Audio API
        this.playSystemBeep(soundType);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  private playSystemBeep(soundType: SoundType) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different sounds
    const frequencies: Record<SoundType, number[]> = {
      order_buy: [800, 1000],
      order_sell: [600, 400],
      order_filled: [800, 1000, 1200],
      price_alert: [1200, 900, 1200],
      error: [400, 300],
      arena_big_win: [523, 659, 784],
      arena_small_win: [523, 659],
      arena_loss: [392]
    };
    
    const freq = frequencies[soundType] || [800];
    oscillator.frequency.value = freq[0];
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('trading_sounds_enabled', enabled.toString());
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
    localStorage.setItem('trading_sounds_volume', this.volume.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Singleton instance
export const soundManager = new SoundNotificationManager();
