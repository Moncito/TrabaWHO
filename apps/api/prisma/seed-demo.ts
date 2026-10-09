import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * OPTIONAL rehearsal accounts, clearly labelled as demo (name prefix + @trabawho.test emails,
 * a reserved test domain). Not verified. Run: npm run db:seed:demo -w apps/api
 * Password: DEMO_PASSWORD env var, or the printed default.
 */
const prisma = new PrismaClient();
const PASSWORD = process.env.DEMO_PASSWORD || "trabawho-demo";
const CITY = "Quezon City";

const accounts: { email: string; role: Role; name: string; phone: string; barangay: string; services: string[]; bio: string; yearsExperience: number }[] = [
  { email: "demo.client@trabawho.test", role: "CLIENT", name: "Demo Client", phone: "09170000001", barangay: "Batasan Hills", services: [], bio: "", yearsExperience: 0 },
  { email: "demo.plumber@trabawho.test", role: "WORKER", name: "Demo Plumber", phone: "09180000001", barangay: "Batasan Hills", services: ["PLUMBING"], bio: "Demo account for rehearsals.", yearsExperience: 5 },
  { email: "demo.electrician@trabawho.test", role: "WORKER", name: "Demo Electrician", phone: "09180000002", barangay: "Holy Spirit", services: ["ELECTRICAL", "AIRCON"], bio: "Demo account for rehearsals.", yearsExperience: 8 },
  { email: "demo.carpenter@trabawho.test", role: "WORKER", name: "Demo Carpenter", phone: "09180000003", barangay: "Commonwealth", services: ["CARPENTRY", "WELDING"], bio: "Demo account for rehearsals.", yearsExperience: 3 },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const a of accounts) {
    const data = { ...a, city: CITY, passwordHash };
    await prisma.user.upsert({ where: { email: a.email }, update: data, create: data });
  }
  console.log(`Demo accounts (${CITY}), password: ${process.env.DEMO_PASSWORD ? "<DEMO_PASSWORD>" : PASSWORD}`);
  for (const a of accounts) console.log(`  ${a.role.padEnd(6)}  ${a.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
