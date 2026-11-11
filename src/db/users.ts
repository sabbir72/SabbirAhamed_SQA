import { db } from './index.ts';
import { users } from './schema.ts';

export const OWNER_ADMIN_EMAIL = 'sabbircse72@gmail.com';

export async function getOrCreateUser(uid: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const role = normalizedEmail === OWNER_ADMIN_EMAIL ? 'admin' : 'user';
  const now = new Date();

  try {
    const [row] = await db
      .insert(users)
      .values({
        id: uid,
        email: normalizedEmail,
        role,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: normalizedEmail,
          role,
          updatedAt: now,
        },
      })
      .returning();

    return row;
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}
