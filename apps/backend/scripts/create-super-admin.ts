import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  const { email, password, name } = args;
  if (!email || !password || !name) {
    console.error(
      'Usage: npm run seed:super-admin -- --email=... --password=... --name="..."',
    );
    process.exit(1);
  }

  return { email, password, name };
}

async function main() {
  const { email, password, name } = parseArgs();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient();

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw error ?? new Error('Échec de la création du compte Supabase Auth');
    }

    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'super_admin' },
    });

    await prisma.adminAccount.create({
      data: {
        id: data.user.id,
        email,
        name,
        roles: {
          create: { roleId: superAdminRole.id },
        },
      },
    });

    console.log(`Super admin créé : ${email} (id: ${data.user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
