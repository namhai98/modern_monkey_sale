import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAccountAction } from './accountLinking.js';

const google = (over = {}) => ({
  providerUserId: '11223344',
  email: 'shopper@example.com',
  emailVerified: true,
  name: 'A Shopper',
  ...over,
});

test('a linked identity signs straight in', () => {
  assert.deepEqual(
    decideAccountAction({
      linkedUser: { id: 7, is_active: true },
      existingUser: { id: 7, is_active: true },
      profile: google(),
    }),
    { action: 'signIn', userId: 7 }
  );
});

test('a disabled account cannot sign in through a linked identity', () => {
  assert.deepEqual(
    decideAccountAction({
      linkedUser: { id: 7, is_active: false },
      existingUser: null,
      profile: google(),
    }),
    { action: 'error', error: 'disabled' }
  );
});

test('a verified email links to the existing password account', () => {
  assert.deepEqual(
    decideAccountAction({
      linkedUser: null,
      existingUser: { id: 42, is_active: true },
      profile: google({ emailVerified: true }),
    }),
    { action: 'link', userId: 42 }
  );
});

// The account-takeover case: without this, anyone who can register
// shopper@example.com at a provider inherits that shopper's order history.
test('an UNVERIFIED email is refused rather than linked', () => {
  assert.deepEqual(
    decideAccountAction({
      linkedUser: null,
      existingUser: { id: 42, is_active: true },
      profile: google({ emailVerified: false }),
    }),
    { action: 'error', error: 'email_taken' }
  );
});

test('a disabled account cannot be claimed by linking either', () => {
  assert.deepEqual(
    decideAccountAction({
      linkedUser: null,
      existingUser: { id: 42, is_active: false },
      profile: google(),
    }),
    { action: 'error', error: 'disabled' }
  );
});

test('no email from the provider is a dead end', () => {
  for (const email of [null, undefined, '']) {
    assert.deepEqual(
      decideAccountAction({ linkedUser: null, existingUser: null, profile: google({ email }) }),
      { action: 'error', error: 'no_email' },
      `email=${JSON.stringify(email)}`
    );
  }
});

test('a brand-new email creates an account', () => {
  assert.deepEqual(
    decideAccountAction({ linkedUser: null, existingUser: null, profile: google() }),
    { action: 'create' }
  );
});

test('an unverified email with no existing account still creates one', () => {
  // Nothing to take over, so there is no reason to refuse.
  assert.deepEqual(
    decideAccountAction({
      linkedUser: null,
      existingUser: null,
      profile: google({ emailVerified: false }),
    }),
    { action: 'create' }
  );
});
