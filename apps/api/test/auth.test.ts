import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();
const unique = () => `t${randomUUID().slice(0, 8)}@example.com`;

const client = (email = unique()) => ({
  email,
  password: "correct horse",
  name: "Ana Reyes",
  phone: "0917 123 4567",
  role: "CLIENT",
  city: "Quezon City",
  barangay: "Batasan Hills",
});

const worker = (email = unique()) => ({
  ...client(email),
  name: "Ben Cruz",
  role: "WORKER",
  services: ["PLUMBING"],
  bio: "Tubero, 10 taon na.",
  yearsExperience: 10,
});

const booking = () => ({
  clientRef: randomUUID(),
  serviceCode: "PLUMBING",
  taskCode: "PLUMB_LEAK_SINK",
  urgency: "TODAY",
  hazards: [],
  aiSummary: "Tumutulo ang lababo",
  aiConfidence: "high",
  aiModel: "test",
  editedByUser: false,
  address: "123 Test St",
  city: "Quezon City",
  barangay: "Batasan Hills",
  createdOffline: false,
});

afterAll(() => prisma.$disconnect());

describe("auth", () => {
  it("signs up a client and returns a token without the password hash", async () => {
    const res = await request(app).post("/auth/signup").send(client());
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ role: "CLIENT", phone: "09171234567", services: [], isVerified: false });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("stores emails lowercased", async () => {
    const email = unique();
    const res = await request(app).post("/auth/signup").send(client(email.toUpperCase()));
    expect(res.body.user.email).toBe(email);
  });

  it("rejects a worker with no services and short passwords", async () => {
    expect((await request(app).post("/auth/signup").send({ ...worker(), services: [] })).status).toBe(400);
    expect((await request(app).post("/auth/signup").send({ ...client(), password: "short" })).status).toBe(400);
  });

  it("never lets signup set isVerified", async () => {
    const res = await request(app).post("/auth/signup").send({ ...worker(), isVerified: true });
    expect(res.status).toBe(201);
    expect(res.body.user.isVerified).toBe(false);
  });

  it("returns 409 for a duplicate email", async () => {
    const email = unique();
    expect((await request(app).post("/auth/signup").send(client(email))).status).toBe(201);
    expect((await request(app).post("/auth/signup").send(worker(email))).status).toBe(409);
  });

  it("logs in with the right password, 401 with the same message otherwise", async () => {
    const email = unique();
    await request(app).post("/auth/signup").send(client(email));

    const ok = await request(app).post("/auth/login").send({ email, password: "correct horse" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(email);
    expect(typeof ok.body.token).toBe("string");

    const wrong = await request(app).post("/auth/login").send({ email, password: "wrong horse" });
    const unknown = await request(app).post("/auth/login").send({ email: unique(), password: "correct horse" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });
});

describe("/me", () => {
  it("requires a valid token", async () => {
    expect((await request(app).get("/me")).status).toBe(401);
    expect((await request(app).get("/me").set("Authorization", "Bearer not-a-token")).status).toBe(401);
  });

  it("returns and updates the current user", async () => {
    const { body } = await request(app).post("/auth/signup").send(worker());
    const auth = { Authorization: `Bearer ${body.token}` };

    const me = await request(app).get("/me").set(auth);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(body.user.id);
    expect(me.body).not.toHaveProperty("passwordHash");

    const patched = await request(app).patch("/me").set(auth).send({ bio: "Bagong bio", yearsExperience: 12, services: ["PLUMBING", "WELDING"] });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ bio: "Bagong bio", yearsExperience: 12, services: ["PLUMBING", "WELDING"] });

    // Cannot sneak in privileged fields.
    expect((await request(app).patch("/me").set(auth).send({ isVerified: true })).status).toBe(400);
  });
});

describe("bookings + worker profiles", () => {
  it("requires a token to create a booking; the old x-user-id header is ignored", async () => {
    const { body } = await request(app).post("/auth/signup").send(client());
    expect((await request(app).post("/bookings").send(booking())).status).toBe(401);
    expect((await request(app).post("/bookings").set("x-user-id", body.user.id).send(booking())).status).toBe(401);

    const res = await request(app).post("/bookings").set("Authorization", `Bearer ${body.token}`).send(booking());
    expect(res.status).toBe(201);
    expect(res.body.clientId).toBe(body.user.id);
  });

  it("no longer lists users", async () => {
    expect((await request(app).get("/users")).status).toBe(404);
  });

  it("shows a public worker profile; phone only after the worker took your booking", async () => {
    const c = (await request(app).post("/auth/signup").send(client())).body;
    const w = (await request(app).post("/auth/signup").send(worker())).body;
    const cAuth = { Authorization: `Bearer ${c.token}` };
    const wAuth = { Authorization: `Bearer ${w.token}` };

    const before = await request(app).get(`/workers/${w.user.id}`).set(cAuth);
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ name: "Ben Cruz", services: ["PLUMBING"], yearsExperience: 10, isVerified: false, jobsCompleted: 0 });
    expect(before.body).not.toHaveProperty("phone");
    expect(before.body).not.toHaveProperty("email");
    expect(before.body).not.toHaveProperty("passwordHash");

    const b = (await request(app).post("/bookings").set(cAuth).send(booking())).body;
    expect((await request(app).post(`/bookings/${b.id}/accept`).set(wAuth)).status).toBe(200);
    const report = { clientRef: randomUUID(), tasksDone: ["PLUMB_LEAK_SINK"], materials: [], durationMinutes: 60, notes: "", createdOffline: false };
    expect((await request(app).post(`/bookings/${b.id}/report`).set(wAuth).send(report)).status).toBe(201);

    const after = await request(app).get(`/workers/${w.user.id}`).set(cAuth);
    expect(after.body.phone).toBe("09171234567");
    expect(after.body.jobsCompleted).toBe(1);

    const anon = await request(app).get(`/workers/${w.user.id}`);
    expect(anon.body).not.toHaveProperty("phone");

    expect((await request(app).get(`/workers/${c.user.id}`)).status).toBe(404);
  });
});
