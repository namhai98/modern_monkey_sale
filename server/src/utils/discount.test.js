import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDiscountedPrice,
  isDiscountActive,
  discountStatus,
  pickBestActiveDiscount,
} from './discount.js';

const pct = (value) => ({ type: 'percentage', value });
const fixed = (value) => ({ type: 'fixed', value });

test('percentage discounts', () => {
  assert.equal(computeDiscountedPrice(100000, pct(10)).finalPrice, 90000);
  assert.equal(computeDiscountedPrice(100000, pct(20)).finalPrice, 80000);
  assert.equal(computeDiscountedPrice(100000, pct(20)).discountAmount, 20000);
  assert.equal(computeDiscountedPrice(250, pct(20)).finalPrice, 200);
});

test('fixed discounts', () => {
  assert.equal(computeDiscountedPrice(100000, fixed(20000)).finalPrice, 80000);
  assert.equal(computeDiscountedPrice(100000, fixed(20000)).discountAmount, 20000);
});

test('final price never goes negative', () => {
  assert.equal(computeDiscountedPrice(100000, pct(100)).finalPrice, 0);
  assert.equal(computeDiscountedPrice(50000, fixed(70000)).finalPrice, 0);
  assert.equal(computeDiscountedPrice(100000, fixed(150000)).finalPrice, 0);
  assert.equal(computeDiscountedPrice(100000, pct(100)).discountAmount, 100000);
});

test('no / unknown discount is a no-op', () => {
  assert.deepEqual(computeDiscountedPrice(1200, null), {
    finalPrice: 1200,
    discountAmount: 0,
    discount: null,
  });
  assert.equal(computeDiscountedPrice(1200, { type: 'bogus', value: 50 }).finalPrice, 1200);
});

test('rounding stays at 2 decimals', () => {
  assert.equal(computeDiscountedPrice(99.99, pct(15)).finalPrice, 84.99);
  assert.equal(computeDiscountedPrice(29.99, pct(33)).finalPrice, 20.09);
});

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

test('active window logic', () => {
  const base = { is_active: true, start_date: day(-2), end_date: day(2) };
  assert.equal(isDiscountActive(base), true);
  assert.equal(isDiscountActive({ ...base, is_active: false }), false); // disabled
  assert.equal(isDiscountActive({ ...base, end_date: day(-1) }), false); // expired
  assert.equal(isDiscountActive({ ...base, start_date: day(1) }), false); // future
});

test('expired / future / disabled discounts leave the price alone', () => {
  const price = 100000;
  const expired = { ...pct(20), is_active: true, start_date: day(-10), end_date: day(-1) };
  const future = { ...pct(20), is_active: true, start_date: day(1), end_date: day(10) };
  const disabled = { ...pct(20), is_active: false, start_date: day(-1), end_date: day(1) };
  for (const d of [expired, future, disabled]) {
    assert.equal(pickBestActiveDiscount(price, [d]), null);
  }
});

test('discountStatus labels', () => {
  assert.equal(discountStatus({ is_active: false, start_date: day(-1), end_date: day(1) }), 'disabled');
  assert.equal(discountStatus({ is_active: true, start_date: day(1), end_date: day(3) }), 'scheduled');
  assert.equal(discountStatus({ is_active: true, start_date: day(-3), end_date: day(-1) }), 'expired');
  assert.equal(discountStatus({ is_active: true, start_date: day(-1), end_date: day(1) }), 'active');
});

test('multiple discounts do not stack — cheapest wins', () => {
  const price = 100000;
  const a = { id: 1, ...pct(10), is_active: true, start_date: day(-1), end_date: day(1) };
  const b = { id: 2, ...fixed(20000), is_active: true, start_date: day(-1), end_date: day(1) };
  const best = pickBestActiveDiscount(price, [a, b]);
  assert.equal(best.id, 2);
  assert.equal(computeDiscountedPrice(price, best).finalPrice, 80000); // not 70000
});

test('deterministic tie-break on equal final price -> lowest id', () => {
  const price = 100000;
  const a = { id: 5, ...pct(20), is_active: true, start_date: day(-1), end_date: day(1) };
  const b = { id: 3, ...fixed(20000), is_active: true, start_date: day(-1), end_date: day(1) };
  assert.equal(pickBestActiveDiscount(price, [a, b]).id, 3);
});
