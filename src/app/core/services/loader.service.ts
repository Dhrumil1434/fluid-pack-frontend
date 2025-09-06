import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoaderState {
  isLoading: boolean;
  message?: string;
  type?: 'global' | 'card' | 'button';
  cardId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private globalLoaderSubject = new BehaviorSubject<LoaderState>({ isLoading: false });
  private cardLoadersSubject = new BehaviorSubject<Map<string, LoaderState>>(new Map());
  private buttonLoadersSubject = new BehaviorSubject<Map<string, boolean>>(new Map());

  // Signals for reactive updates
  public globalLoader = signal<LoaderState>({ isLoading: false });
  public cardLoaders = signal<Map<string, LoaderState>>(new Map());
  public buttonLoaders = signal<Map<string, boolean>>(new Map());

  // Global loader methods
  showGlobalLoader(message?: string): void {
    const state: LoaderState = {
      isLoading: true,
      message: message || 'Loading...',
      type: 'global',
    };
    this.globalLoaderSubject.next(state);
    this.globalLoader.set(state);
  }

  hideGlobalLoader(): void {
    const state: LoaderState = { isLoading: false, type: 'global' };
    this.globalLoaderSubject.next(state);
    this.globalLoader.set(state);
  }

  // Card loader methods
  showCardLoader(cardId: string, message?: string): void {
    const currentCardLoaders = this.cardLoadersSubject.value;
    const newCardLoaders = new Map(currentCardLoaders);

    newCardLoaders.set(cardId, {
      isLoading: true,
      message: message || 'Loading...',
      type: 'card',
      cardId,
    });

    this.cardLoadersSubject.next(newCardLoaders);
    this.cardLoaders.set(newCardLoaders);
  }

  hideCardLoader(cardId: string): void {
    const currentCardLoaders = this.cardLoadersSubject.value;
    const newCardLoaders = new Map(currentCardLoaders);

    newCardLoaders.set(cardId, {
      isLoading: false,
      type: 'card',
      cardId,
    });

    this.cardLoadersSubject.next(newCardLoaders);
    this.cardLoaders.set(newCardLoaders);
  }

  // Button loader methods
  showButtonLoader(buttonId: string): void {
    const currentButtonLoaders = this.buttonLoadersSubject.value;
    const newButtonLoaders = new Map(currentButtonLoaders);
    newButtonLoaders.set(buttonId, true);

    this.buttonLoadersSubject.next(newButtonLoaders);
    this.buttonLoaders.set(newButtonLoaders);
  }

  hideButtonLoader(buttonId: string): void {
    const currentButtonLoaders = this.buttonLoadersSubject.value;
    const newButtonLoaders = new Map(currentButtonLoaders);
    newButtonLoaders.set(buttonId, false);

    this.buttonLoadersSubject.next(newButtonLoaders);
    this.buttonLoaders.set(newButtonLoaders);
  }

  // Observable getters
  getGlobalLoader$(): Observable<LoaderState> {
    return this.globalLoaderSubject.asObservable();
  }

  getCardLoaders$(): Observable<Map<string, LoaderState>> {
    return this.cardLoadersSubject.asObservable();
  }

  getButtonLoaders$(): Observable<Map<string, boolean>> {
    return this.buttonLoadersSubject.asObservable();
  }

  // Utility methods
  isGlobalLoading(): boolean {
    return this.globalLoaderSubject.value.isLoading;
  }

  isCardLoading(cardId: string): boolean {
    return this.cardLoadersSubject.value.get(cardId)?.isLoading || false;
  }

  isButtonLoading(buttonId: string): boolean {
    return this.buttonLoadersSubject.value.get(buttonId) || false;
  }

  // Clear all loaders
  clearAllLoaders(): void {
    this.hideGlobalLoader();
    this.cardLoadersSubject.next(new Map());
    this.buttonLoadersSubject.next(new Map());
    this.cardLoaders.set(new Map());
    this.buttonLoaders.set(new Map());
  }

  // Get loading count for multiple operations
  getActiveLoadersCount(): number {
    let count = 0;
    if (this.isGlobalLoading()) count++;
    this.cardLoadersSubject.value.forEach(state => {
      if (state.isLoading) count++;
    });
    this.buttonLoadersSubject.value.forEach(isLoading => {
      if (isLoading) count++;
    });
    return count;
  }
}
