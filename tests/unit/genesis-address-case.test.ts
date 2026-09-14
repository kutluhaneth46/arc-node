// Copyright 2026 Circle Internet Group, Inc. All rights reserved.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { expect } from 'chai'
import { schemaNativeFiatToken } from '../../scripts/genesis/NativeFiatToken'
import { schemaProtocolConfig } from '../../scripts/genesis/ProtocolConfig'
import { sameAddress } from '../../scripts/genesis/types'

const ADMIN_CHECKSUM = '0xAaaaAaAaAaaAaaAaaAaaAaaAaaAaaAaaAaaAaaAa'
const ADMIN_LOWER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const fiatBase = {
  proxy: { admin: ADMIN_CHECKSUM },
  owner: '0x2222222222222222222222222222222222222222',
  pauser: '0x3333333333333333333333333333333333333333',
  blacklister: '0x4444444444444444444444444444444444444444',
  masterMinter: '0x5555555555555555555555555555555555555555',
  rescuer: '0x6666666666666666666666666666666666666666',
  minters: [{ address: '0x7777777777777777777777777777777777777777', allowance: 1n }],
}

const protocolBase = {
  proxy: { admin: ADMIN_CHECKSUM },
  owner: '0x2222222222222222222222222222222222222222',
  controller: '0x3333333333333333333333333333333333333333',
  pauser: '0x4444444444444444444444444444444444444444',
  feeParams: {
    alpha: 1n,
    kRate: 1n,
    inverseElasticityMultiplier: 1n,
    minBaseFee: 0n,
    maxBaseFee: 1_000_000n,
    blockGasLimit: 30_000_000n,
  },
  consensusParams: {
    timeoutProposeMs: 3000n,
    timeoutProposeDeltaMs: 500n,
    timeoutPrevoteMs: 1000n,
    timeoutPrevoteDeltaMs: 500n,
    timeoutPrecommitMs: 1000n,
    timeoutPrecommitDeltaMs: 500n,
    timeoutRebroadcastMs: 2000n,
    targetBlockTimeMs: 1000n,
  },
}

describe('genesis address case sensitivity', () => {
  it('sameAddress treats EIP-55 and lowercase forms as equal', () => {
    expect(sameAddress(ADMIN_CHECKSUM, ADMIN_LOWER)).to.equal(true)
    expect(sameAddress(ADMIN_CHECKSUM, fiatBase.owner as `0x${string}`)).to.equal(false)
  })

  it('rejects an operator that matches proxy.admin with different casing', () => {
    const result = schemaNativeFiatToken.safeParse({ ...fiatBase, owner: ADMIN_LOWER })
    expect(result.success).to.equal(false)
  })

  it('rejects a minter that matches proxy.admin with different casing', () => {
    const result = schemaNativeFiatToken.safeParse({
      ...fiatBase,
      minters: [{ address: ADMIN_LOWER, allowance: 1n }],
    })
    expect(result.success).to.equal(false)
  })

  it('rejects duplicate minters that differ only by case', () => {
    const result = schemaNativeFiatToken.safeParse({
      ...fiatBase,
      minters: [
        { address: '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb', allowance: 1n },
        { address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', allowance: 2n },
      ],
    })
    expect(result.success).to.equal(false)
  })

  it('still accepts distinct operators regardless of casing', () => {
    const result = schemaNativeFiatToken.safeParse(fiatBase)
    expect(result.success).to.equal(true)
  })

  it('rejects ProtocolConfig owner that matches proxy.admin with different casing', () => {
    const result = schemaProtocolConfig.safeParse({ ...protocolBase, owner: ADMIN_LOWER })
    expect(result.success).to.equal(false)
  })
})
