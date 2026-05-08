const SESSION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createSessionId(length = 6) {
  let id = "";

  for (let index = 0; index < length; index += 1) {
    id += SESSION_ALPHABET[Math.floor(Math.random() * SESSION_ALPHABET.length)];
  }

  return id;
}

export function createParticipantId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
