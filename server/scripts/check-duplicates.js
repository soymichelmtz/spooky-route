import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    const houses = await prisma.house.findMany({ select: { id:true, userId:true, addressText:true } });
    const map = new Map();
    for (const h of houses) {
      map.set(h.addressText, (map.get(h.addressText) || []).concat(h));
    }
    const dups = [...map.entries()].filter(([_, arr]) => arr.length > 1);
    if (!dups.length) {
      console.log('No hay direcciones duplicadas.');
    } else {
      console.log('Direcciones duplicadas encontradas:');
      for (const [addr, arr] of dups) {
        console.log('\n--', addr);
        arr.forEach(r => console.log('  houseId=' + r.id + ' userId=' + r.userId));
      }
      process.exitCode = 2; // Non-zero to warn
    }
  } catch (e) {
    console.error('Error verificando duplicados', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
