export const NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "testnet";
export const CONTRACT_ID = process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID ?? "";
export const COMPANY_ID = process.env.NEXT_PUBLIC_NEAR_COMPANY_ID ?? "insightforge";
export const RPC_URL = process.env.NEAR_RPC_URL ?? (NETWORK === "mainnet" ? "https://free.rpc.fastnear.com" : "https://test.rpc.fastnear.com");
export const EXPLORER = NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";

export const chainConfigured = () => Boolean(CONTRACT_ID);
export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const accountUrl = (id: string) => `${EXPLORER}/address/${id}`;

const YOCTO_PER_MICRO = BigInt("1000000000000000000"); // 1 NEAR = 1e24 yocto = 1e6 micro-NEAR

/** NEAR (number) → yoctoNEAR (string), precise to 6 decimals. */
export function toYocto(near: number): string {
  return (BigInt(Math.round(near * 1e6)) * YOCTO_PER_MICRO).toString();
}

/** yoctoNEAR (string) → NEAR (number). */
export function fromYocto(yocto: string | number | bigint): number {
  return Number(BigInt(yocto) / YOCTO_PER_MICRO) / 1e6;
}
