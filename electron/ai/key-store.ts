import { safeStorage } from "electron";
import Store from "electron-store";

const store = new Store<{ aiKeys: Record<string, string> }>({
  defaults: { aiKeys: {} }
});

export function setApiKey(providerId: string, key: string) {
  const keys = store.get("aiKeys");
  if (safeStorage.isEncryptionAvailable()) {
    keys[providerId] = safeStorage.encryptString(key).toString("base64");
  } else {
    keys[providerId] = key;
  }
  store.set("aiKeys", keys);
}

export function getApiKey(providerId: string): string {
  const keys = store.get("aiKeys");
  const raw = keys[providerId];
  if (!raw) return "";
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(raw, "base64"));
    } catch {
      return raw;
    }
  }
  return raw;
}

export function removeApiKey(providerId: string) {
  const keys = store.get("aiKeys");
  delete keys[providerId];
  store.set("aiKeys", keys);
}

export function listConfiguredProviders(): string[] {
  const keys = store.get("aiKeys");
  return Object.keys(keys).filter((k) => Boolean(keys[k]));
}
