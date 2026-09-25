/** Anmeldenachricht für "Sign-In with Solana". Muss auf Client und Server identisch sein. */
export function buildSignInMessage(params: {
  domain: string;
  address: string;
  nonce: string;
}): string {
  return [
    `${params.domain} möchte, dass du dich mit deiner Solana-Wallet anmeldest.`,
    "",
    `Adresse: ${params.address}`,
    `Nonce: ${params.nonce}`,
    "",
    "Dies ist nur eine Signatur zur Anmeldung.",
    "Es wird keine Transaktion ausgeführt und es entstehen keine Gebühren.",
  ].join("\n");
}
