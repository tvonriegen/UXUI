import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

class DeterministicStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(String(key), String(value));
  }

  namedItem(key: string) {
    return this.getItem(key);
  }
}

const localStorage = new DeterministicStorage();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorage,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorage,
});

beforeEach(() => {
  localStorage.clear();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
