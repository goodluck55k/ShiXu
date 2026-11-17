export type WishActionResult = { ok: true } | { ok: false; reason: string };

export interface WishCelebrationSignal {
  wishId: string;
  nonce: number;
}