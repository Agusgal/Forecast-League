import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/auth/route";

test("connected signup requires the private-data migration and passes validated details to Auth without echoing them", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const oldFetch = globalThis.fetch;
  const personalData = { birthCountry: "AR", residenceCountry: "CL", age: 31, sex: "undisclosed", city: "Private fixture city" };
  const request = () => new NextRequest("http://localhost/api/auth", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify({ action: "signup", email: "remote-fixture@example.test", username: "Fixture", password: "test-only-password", personalData }),
  });
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_test";
    let ready = false;
    let signupCalls = 0;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/rpc/registration_ready")) return ready ? Response.json(true) : Response.json({message:"Missing migration"},{status:404});
      assert.match(url, /\/auth\/v1\/signup/);
      signupCalls++;
      const payload = JSON.parse(String(init?.body));
      assert.deepEqual(payload.data.personal_data, personalData);
      assert.equal(payload.data.username, "Fixture");
      return Response.json({ user: { id: "11111111-1111-4111-8111-111111111111", email: "remote-fixture@example.test", identities: [] }, session: null });
    };
    assert.equal((await POST(request())).status, 503);
    assert.equal(signupCalls, 0);
    ready = true;
    const result = await POST(request());
    assert.equal(result.status, 200);
    const response = await result.json();
    assert.equal(response.user, null);
    assert.equal(JSON.stringify(response).includes(personalData.city), false);
    assert.equal(signupCalls, 1);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
