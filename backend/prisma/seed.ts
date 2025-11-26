import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping seed.');
    return;
  }

  // Create default admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      email: 'admin@platforma-licitatii.ro',
      role: 'admin',
    },
  });
  console.log('✅ Created admin user:', admin.username);

  // Create test client user
  const clientPassword = await hashPassword('client123');
  const client = await prisma.user.create({
    data: {
      username: 'client_test',
      password: clientPassword,
      email: 'client@test.ro',
      role: 'client',
      createdBy: admin.id,
    },
  });
  console.log('✅ Created client user:', client.username);

  // Create test supplier user
  const supplierPassword = await hashPassword('supplier123');
  const supplier = await prisma.user.create({
    data: {
      username: 'supplier_test',
      password: supplierPassword,
      email: 'supplier@test.ro',
      role: 'supplier',
      createdBy: admin.id,
    },
  });
  console.log('✅ Created supplier user:', supplier.username);

  console.log('\n📋 Test users created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('  Email: admin@platforma-licitatii.ro');
  console.log('');
  console.log('Client:');
  console.log('  Username: client_test');
  console.log('  Password: client123');
  console.log('  Email: client@test.ro');
  console.log('');
  console.log('Supplier:');
  console.log('  Username: supplier_test');
  console.log('  Password: supplier123');
  console.log('  Email: supplier@test.ro');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
