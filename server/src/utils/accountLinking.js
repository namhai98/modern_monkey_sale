/* The account-linking policy for social sign-in, as a pure decision so it can
 * be tested without a database. Given what we found for a provider profile,
 * what do we do?
 *
 * 1. Identity already linked  → sign in.
 * 2. Email matches an account AND the provider says the address is verified
 *                             → link the identity to that account.
 * 3. Email matches but is NOT verified
 *                             → refuse. Auto-linking on an unverified address
 *                               is an account-takeover route: anyone able to
 *                               register that address at the provider would
 *                               inherit the order history.
 * 4. Otherwise                → create a passwordless customer.
 *
 * A disabled account stays disabled whichever door it is knocking on.
 */
export function decideAccountAction({ linkedUser, existingUser, profile }) {
  if (linkedUser) {
    if (!linkedUser.is_active) return { action: 'error', error: 'disabled' };
    return { action: 'signIn', userId: linkedUser.id };
  }

  // Facebook can withhold the address if the shopper declines the scope, and we
  // have nothing else to key an account on.
  if (!profile.email) return { action: 'error', error: 'no_email' };

  if (existingUser) {
    if (!profile.emailVerified) return { action: 'error', error: 'email_taken' };
    if (!existingUser.is_active) return { action: 'error', error: 'disabled' };
    return { action: 'link', userId: existingUser.id };
  }

  return { action: 'create' };
}
