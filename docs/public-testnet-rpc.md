# Arc Testnet public RPC

Reference for application developers using the Arc Testnet JSON-RPC endpoints.
For node-operator follow/forwarder configuration, see [Running an Arc Node](running-an-arc-node.md).

## Endpoints

Arc Testnet (chain ID `5042002`) exposes multiple public HTTPS endpoints.
Distribute traffic across them to reduce rate-limit errors (see [Rate limiting](#rate-limiting)).

| URL | Notes |
| --- | --- |
| `https://rpc.testnet.arc.network` | Primary public endpoint |
| `https://rpc.testnet.arc.io` | Alternate public endpoint |
| `https://rpc.drpc.testnet.arc.network` | DRPC provider |
| `https://rpc.drpc.testnet.arc.io` | DRPC provider (alternate host) |
| `https://rpc.blockdaemon.testnet.arc.network` | Blockdaemon provider |
| `https://rpc.blockdaemon.testnet.arc.io` | Blockdaemon provider (alternate host) |
| `https://rpc.quicknode.testnet.arc.network` | QuickNode provider |

These URLs are community-facing read/write endpoints.
The `.arc.io` hosts are the same provider set documented for node follow mode in
[Running an Arc Node](running-an-arc-node.md); the `.arc.network` hosts are the
URLs most sample apps and wallets default to.

## Gas estimation limits

### Node default vs public endpoints

Self-hosted `arc-node-execution` defaults to `--rpc.gascap=30000000` (30M gas).
That cap applies to `eth_call`, `eth_estimateGas`, and related simulation paths.
It is a **node-local RPC budget**, not the protocol block gas limit.

Public testnet endpoints may apply a **lower effective cap**.
As of 2026-08, `https://rpc.testnet.arc.network` rejects `eth_estimateGas` requests
whose intrinsic gas exceeds **16,777,216 (2²⁴)** with:

```json
{"code":-32000,"message":"gas required exceeds allowance (16777216)"}
```

The parenthesized limit is the key diagnostic:

| Observed `<limit>` | Likely cause |
| --- | --- |
| `16777216` | Public-endpoint or EIP-7825 per-transaction gas cap |
| `30000000` | Node `--rpc.gascap` default |
| Other value | Compare against the operator's configured `--rpc.gascap` |

The block gas limit on Arc Testnet is 30M (`eth_getBlockByNumber("latest").gasLimit`),
so a transaction needing 17–30M gas may be valid on-chain even when the public
endpoint refuses to estimate it.

**Do not treat an `eth_estimateGas` failure as proof that a transaction is
impossible on-chain.** Retry against a node you control with a higher
`--rpc.gascap`, or submit with an explicit `gas` limit when you have validated the
budget another way.

The same `gas required exceeds allowance (<limit>)` string is also returned when
the sender's balance-derived gas allowance is exhausted — compare `<limit>` against
the configured cap to disambiguate. See [BREAKING_CHANGES.md](../BREAKING_CHANGES.md#v072).

### EIP-7825 per-transaction cap

Arc Testnet enforces the EIP-7825 (Osaka) per-transaction gas limit of
16,777,216 (2²⁴). This protocol cap is independent of the RPC gas cap and applies
whether you estimate through a public endpoint or a self-hosted node.

## Rate limiting

Public endpoints enforce per-connection request rate limits.
When exceeded, the JSON-RPC error is:

```json
{"code":-32011,"message":"request limit reached"}
```

Depending on the client layer, this surfaces as:

- viem `RpcRequestError` with `shortMessage: "RPC Request failed."`
- MetaMask toasts that look like a contract revert (`"Request is being rate limited"`)
- Partial failures inside JSON-RPC batch responses

`viem`'s `fallback()` transport retries on transport-level errors across providers,
which reduces how often `-32011` fires for read calls:

```ts
import { createPublicClient, fallback, http } from "viem";
import { arcTestnet } from "viem/chains"; // or your chain definition

const RPC_URLS = [
  "https://rpc.testnet.arc.network",
  "https://rpc.drpc.testnet.arc.network",
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.quicknode.testnet.arc.network",
];

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback(RPC_URLS.map((url) => http(url))),
});
```

`waitForTransactionReceipt` still aborts on the first `-32011` poll unless you wrap
it with application-level retry — a rate-limited receipt poll does not mean the
transaction failed on-chain.

For production workloads, run your own node or use a dedicated RPC provider with
higher rate limits rather than relying on the shared public endpoints alone.
