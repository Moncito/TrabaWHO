import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Fixed ids so the app's account switcher and demo script are stable across reseeds.
const CITY = "Quezon City";
const users: Prisma.UserCreateInput[] = [
  { id: "00000000-0000-4000-8000-000000000001", role: "CLIENT", name: "Juan dela Cruz", phone: "09170000001", services: [], city: CITY, barangay: "Batasan Hills" },
  { id: "00000000-0000-4000-8000-000000000002", role: "CLIENT", name: "Maria Santos", phone: "09170000002", services: [], city: CITY, barangay: "Commonwealth" },
  { id: "00000000-0000-4000-8000-000000000101", role: "WORKER", name: "Ramon Reyes", phone: "09180000101", services: ["ELECTRICAL"], city: CITY, barangay: "Holy Spirit", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000102", role: "WORKER", name: "Lito Garcia", phone: "09180000102", services: ["ELECTRICAL", "AIRCON"], city: CITY, barangay: "Payatas", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000103", role: "WORKER", name: "Ben Villanueva", phone: "09180000103", services: ["PLUMBING"], city: CITY, barangay: "Batasan Hills", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000104", role: "WORKER", name: "Nonoy Cruz", phone: "09180000104", services: ["PLUMBING", "CARPENTRY"], city: CITY, barangay: "Bagong Silangan", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000105", role: "WORKER", name: "Jun Mendoza", phone: "09180000105", services: ["CARPENTRY"], city: CITY, barangay: "Commonwealth", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000106", role: "WORKER", name: "Dodong Ramos", phone: "09180000106", services: ["AIRCON"], city: CITY, barangay: "Holy Spirit", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000107", role: "WORKER", name: "Rey Bautista", phone: "09180000107", services: ["AIRCON"], city: CITY, barangay: "Payatas", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000108", role: "WORKER", name: "Carlo Aquino", phone: "09180000108", services: ["WELDING"], city: CITY, barangay: "Batasan Hills", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000109", role: "WORKER", name: "Tony Lim", phone: "09180000109", services: ["WELDING", "CARPENTRY"], city: CITY, barangay: "Commonwealth", isVerified: true },
  { id: "00000000-0000-4000-8000-000000000110", role: "WORKER", name: "Ed Pascual", phone: "09180000110", services: ["PLUMBING", "ELECTRICAL"], city: CITY, barangay: "Bagong Silangan", isVerified: true },
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id! }, update: u, create: u });
  }
  console.log(`Seeded ${users.length} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
