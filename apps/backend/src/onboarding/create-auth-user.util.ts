import { SupabaseAdminService } from '../auth/supabase-admin.service';

/**
 * Crée un utilisateur Supabase Auth pour un onboarding (lead/candidat/RH). Si
 * l'email existe déjà côté Auth mais qu'aucune ligne applicative (compte
 * portail/enseignant/RH) ne le référence — un compte "orphelin" issu d'une
 * création précédente interrompue avant la fin de la transaction Prisma — on
 * le récupère au lieu de bloquer indéfiniment la création avec cet email.
 */
export async function createAuthUserReclaimingOrphans(
  supabaseAdmin: SupabaseAdminService,
  email: string,
  password: string,
  isOrphan: (userId: string) => Promise<boolean>,
): Promise<string> {
  const { data, error } = await supabaseAdmin.client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data.user) {
    return data.user.id;
  }

  if (!error?.message?.toLowerCase().includes('already')) {
    throw error ?? new Error('Échec de la création du compte');
  }

  const listResult = await supabaseAdmin.client.auth.admin.listUsers({ perPage: 200 });
  if (listResult.error) throw error;

  // Cast : sous strictNullChecks:false, TS ne narrow pas correctement l'union
  // discriminée par `error: null` et infère `users` en `never[]`.
  const users = listResult.data.users as Array<{ id: string; email?: string }>;
  const existing = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing || !(await isOrphan(existing.id))) {
    throw error;
  }

  await supabaseAdmin.client.auth.admin.updateUserById(existing.id, { password });
  return existing.id;
}
