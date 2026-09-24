import test from 'node:test';
import assert from 'node:assert/strict';
import { readProviderRate } from './exchangeRate.js';

const erApi = {
  name: 'open.er-api.com',
  pick: (json) => (json?.result === 'success' ? json?.rates?.MNT : null),
};
const currencyApi = { name: 'currency-api', pick: (json) => json?.usd?.mnt };

test('reads the MNT rate out of each provider payload', () => {
  assert.equal(readProviderRate(erApi, { result: 'success', rates: { MNT: 3591.6 } }), 3591.6);
  assert.equal(readProviderRate(currencyApi, { usd: { mnt: 3597.68 } }), 3597.68);
});

test('rejects payloads with no usable rate', () => {
  assert.throws(() => readProviderRate(erApi, { result: 'error' }));
  assert.throws(() => readProviderRate(erApi, {}));
  assert.throws(() => readProviderRate(currencyApi, { usd: { eur: 0.92 } }));
  assert.throws(() => readProviderRate(currencyApi, { usd: { mnt: 'n/a' } }));
});

test('rejects implausible rates rather than repricing the shop', () => {
  assert.throws(() => readProviderRate(currencyApi, { usd: { mnt: 1 } })); // wrong base
  assert.throws(() => readProviderRate(currencyApi, { usd: { mnt: 0 } }));
  assert.throws(() => readProviderRate(currencyApi, { usd: { mnt: -3500 } }));
  assert.throws(() => readProviderRate(currencyApi, { usd: { mnt: 1e9 } }));
});
