import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'smart_fleet_lang';
export type Lang = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  lang = signal<Lang>('fr');

  constructor(private translate: TranslateService) {
    const saved = (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? null;
    const initial: Lang = saved === 'en' ? 'en' : 'fr';
    this.set(initial);
  }

  set(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.translate.setDefaultLang('fr');
    this.translate.use(lang);
    document.documentElement.lang = lang;
  }

  toggle(): void {
    this.set(this.lang() === 'fr' ? 'en' : 'fr');
  }
}

