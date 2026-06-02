import { Injectable } from '@angular/core';

type AudioContextGlobal = typeof globalThis & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

@Injectable({
  providedIn: 'root'
})
export class CustomerNotificationAudioService {
  public async playBeep(): Promise<void> {
    try {
      const audioGlobal = globalThis as AudioContextGlobal;
      const AudioContextConstructor = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      const audioContext = new AudioContextConstructor();

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);

      await new Promise<void>(resolve => {
        oscillator.onended = () => {
          void audioContext.close().finally(resolve);
        };
      });
    } catch (error) {
      console.warn('Notification sound was blocked by the browser:', error);
    }
  }
}
