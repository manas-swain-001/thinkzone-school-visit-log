/**
 * The three demo users from the assignment brief.
 *
 * There is no login and no GET /api/users endpoint, so the picker is built in.
 * The server still validates every userId against its seeded `users`
 * collection, which is what stops a typo in local storage from inventing a
 * fourth user.
 */
export type DemoUser = { userId: string; userName: string; role: string };

export const DEMO_USERS: DemoUser[] = [
  { userId: 'U1001', userName: 'Asha Patra', role: 'Cluster coordinator' },
  { userId: 'U1002', userName: 'Ramesh Nayak', role: 'Cluster coordinator' },
  { userId: 'U1003', userName: 'Sunita Das', role: 'Block officer' },
];

export function findUser(userId: string | null | undefined): DemoUser | null {
  if (!userId) return null;
  return DEMO_USERS.find((user) => user.userId === userId) ?? null;
}
