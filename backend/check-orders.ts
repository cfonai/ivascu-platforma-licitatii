import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      status: true,
      paymentMockStatus: true,
      deliveryStatus: true,
      createdAt: true,
      rfq: { select: { title: true } }
    },
    take: 20
  });

  console.log('Total orders:', orders.length);
  console.log('\nOrders:');
  orders.forEach(order => {
    console.log(`- ${order.rfq.title.substring(0, 30)} | Status: ${order.status} | Payment: ${order.paymentMockStatus} | Delivery: ${order.deliveryStatus}`);
  });

  await prisma.$disconnect();
}

checkOrders();
