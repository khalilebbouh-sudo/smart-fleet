import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationVoiceService {
  voiceEnabled = signal(false);

  setEnabled(on: boolean): void {
    this.voiceEnabled.set(on);
  }

  speak(text: string, lang = 'fr-FR'): void {
    if (!this.voiceEnabled() || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
