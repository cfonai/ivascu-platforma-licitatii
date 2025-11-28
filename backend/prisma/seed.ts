import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin already exists
  let admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  let isExistingDatabase = !!admin;

  if (!admin) {

    // Create default admin user
    const adminPassword = await hashPassword('admin123');
    admin = await prisma.user.create({
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
  } else {
    console.log('ℹ️  Basic users already exist, skipping...');
  }

  // POC: Create mock clients with AI profiles (only if not already exist)
  const existingPocClient = await prisma.user.findUnique({
    where: { username: 'premium_corp' },
  });

  if (existingPocClient) {
    console.log('\n🤖 POC Mock clients already exist, skipping...');
  } else {
    console.log('\n🤖 Creating POC Mock Clients with AI Profiles...');

  const mockClients = [
    {
      username: 'premium_corp',
      password: await hashPassword('client123'),
      email: 'contact@premiumcorp.ro',
      role: 'client',
      companyName: 'Premium Corporation SRL',
      companyAge: 12,
      annualRevenue: 5800000,
      reputationScore: 5.0,
      financialScore: 95,
      completedRFQs: 47,
      rejectedRFQs: 2,
      categoryExpertise: 'IT,Consultanta,Software',
      location: 'București',
    },
    {
      username: 'legacy_industries',
      password: await hashPassword('client123'),
      email: 'office@legacyind.ro',
      role: 'client',
      companyName: 'Legacy Industries SA',
      companyAge: 28,
      annualRevenue: 12500000,
      reputationScore: 4.8,
      financialScore: 92,
      completedRFQs: 128,
      rejectedRFQs: 8,
      categoryExpertise: 'Construcții,Logistică,Producție',
      location: 'Cluj-Napoca',
    },
    {
      username: 'startup_tech',
      password: await hashPassword('client123'),
      email: 'hello@startuptech.ro',
      role: 'client',
      companyName: 'StartupTech Innovation SRL',
      companyAge: 2,
      annualRevenue: 850000,
      reputationScore: 3.7,
      financialScore: 68,
      completedRFQs: 8,
      rejectedRFQs: 3,
      categoryExpertise: 'IT,Marketing Digital,Software',
      location: 'București',
    },
    {
      username: 'growing_srl',
      password: await hashPassword('client123'),
      email: 'info@growingsrl.ro',
      role: 'client',
      companyName: 'Growing Business SRL',
      companyAge: 6,
      annualRevenue: 2300000,
      reputationScore: 4.2,
      financialScore: 78,
      completedRFQs: 23,
      rejectedRFQs: 4,
      categoryExpertise: 'Comerț,Logistică,Import-Export',
      location: 'Timișoara',
    },
    {
      username: 'risky_ventures',
      password: await hashPassword('client123'),
      email: 'contact@riskyventures.ro',
      role: 'client',
      companyName: 'Risky Ventures SRL',
      companyAge: 1,
      annualRevenue: 320000,
      reputationScore: 2.9,
      financialScore: 45,
      completedRFQs: 2,
      rejectedRFQs: 7,
      categoryExpertise: 'Consultanță,Marketing',
      location: 'Iași',
    },
    {
      username: 'mega_construct',
      password: await hashPassword('client123'),
      email: 'office@megaconstruct.ro',
      role: 'client',
      companyName: 'Mega Construct SA',
      companyAge: 18,
      annualRevenue: 18700000,
      reputationScore: 4.6,
      financialScore: 88,
      completedRFQs: 89,
      rejectedRFQs: 5,
      categoryExpertise: 'Construcții,Imobiliare,Infrastructură',
      location: 'București',
    },
    {
      username: 'eco_solutions',
      password: await hashPassword('client123'),
      email: 'info@ecosolutions.ro',
      role: 'client',
      companyName: 'Eco Solutions Romania SRL',
      companyAge: 4,
      annualRevenue: 1250000,
      reputationScore: 4.4,
      financialScore: 82,
      completedRFQs: 16,
      rejectedRFQs: 1,
      categoryExpertise: 'Mediu,Energie,Consultanță',
      location: 'Brașov',
    },
    {
      username: 'high_value_client',
      password: await hashPassword('client123'),
      email: 'contact@highvalue.ro',
      role: 'client',
      companyName: 'High Value Projects SA',
      companyAge: 3,
      annualRevenue: 8900000,
      reputationScore: 3.4,
      financialScore: 62,
      completedRFQs: 5,
      rejectedRFQs: 2,
      categoryExpertise: 'IT,Construcții,Infrastructură',
      location: 'București',
    },
  ];

  for (const clientData of mockClients) {
    const mockClient = await prisma.user.create({
      data: {
        ...clientData,
        createdBy: admin.id,
      },
    });
    console.log(`  ✅ Created POC client: ${mockClient.companyName} (${mockClient.reputationScore}⭐)`);
  }

  // POC: Create mock suppliers with profiles
  console.log('\n🏭 Creating POC Mock Suppliers...');

  const mockSuppliers = [
    {
      username: 'supplier_it_pro',
      password: await hashPassword('supplier123'),
      email: 'contact@itpro.ro',
      role: 'supplier',
      companyName: 'IT Pro Solutions SRL',
      companyAge: 8,
      categoryExpertise: 'IT,Software,Cloud',
      location: 'București',
      reputationScore: 4.7,
      completedRFQs: 34,
    },
    {
      username: 'supplier_construct',
      password: await hashPassword('supplier123'),
      email: 'office@constructpro.ro',
      role: 'supplier',
      companyName: 'Construct Pro SA',
      companyAge: 15,
      categoryExpertise: 'Construcții,Infrastructură',
      location: 'Cluj-Napoca',
      reputationScore: 4.9,
      completedRFQs: 67,
    },
    {
      username: 'supplier_logistics',
      password: await hashPassword('supplier123'),
      email: 'info@logisticsexpress.ro',
      role: 'supplier',
      companyName: 'Logistics Express SRL',
      companyAge: 6,
      categoryExpertise: 'Logistică,Transport,Import-Export',
      location: 'Timișoara',
      reputationScore: 4.5,
      completedRFQs: 41,
    },
  ];

  for (const supplierData of mockSuppliers) {
    const mockSupplier = await prisma.user.create({
      data: {
        ...supplierData,
        createdBy: admin.id,
      },
    });
    console.log(`  ✅ Created POC supplier: ${mockSupplier.companyName}`);
  }
  }

  if (!isExistingDatabase) {
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
    console.log('');
    console.log('🤖 POC Mock Clients: 8 created (premium_corp, legacy_industries, etc.)');
    console.log('🏭 POC Mock Suppliers: 3 created (supplier_it_pro, etc.)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
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
