import test from "node:test";
import assert from "node:assert/strict";
import React, { useState } from "react";
import { create, act } from "react-test-renderer";
import { useTripSync } from "../src/lib/use-trip-sync.ts";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = Object.assign(new EventTarget(), { TRIP_CLOUD_CONFIG: { functionUrl: "https://test.supabase.co/functions/v1/trip-state" }, location: { reload() {} } });
globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
const localKey = "nagoya-hokuriku-pages:trip:TEST";
const remoteKey = "nagoya-hokuriku-v6-2027:map-planner:TEST";
const normalize = value => ({ count: value.count ?? 0 });
const seed = { count: 0 };
let current, edit;
function Harness() {
  const [state, setState] = useState(seed);
  edit = setState;
  current = { ...useTripSync("TEST", state, setState, normalize, seed, true), state };
  return null;
}
async function mount() { let tree; await act(async () => { tree = create(React.createElement(Harness)); }); return tree; }

test("Pages edits persist without a token and never claim cloud synchronization", async () => {
  memory.clear();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("must not make a network request"); };
  const tree = await mount();
  try {
    assert.equal(current.status, "local"); assert.equal(current.ready, true);
    await act(async () => edit({ count: 2 }));
    assert.equal(JSON.parse(memory.get(localKey)).count, 2);
    assert.equal(current.status, "local");
  } finally { await act(async () => tree.unmount()); globalThis.fetch = savedFetch; }
  const reopened = await mount();
  try { assert.equal(current.state.count, 2); } finally { await act(async () => reopened.unmount()); }
});

test("connecting preserves differing local and cloud versions until explicitly resolved", async () => {
  memory.clear(); memory.set(localKey, JSON.stringify({ count: 2 }));
  let remote = { version: 1, state: { count: 9 }, revision: "remote-1", updatedAt: "now" };
  let writes = 0;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    if (init.method === "POST") { writes++; remote = JSON.parse(init.body).changes[remoteKey]; return Response.json({ ok: true }); }
    return Response.json({ states: { [remoteKey]: remote } });
  };
  const tree = await mount();
  try {
    await act(async () => { await current.connect("test-token"); });
    assert.equal(current.status, "conflict"); assert.equal(current.state.count, 2);
    assert.equal(remote.state.count, 9); assert.equal(writes, 0);
    await act(async () => { current.useLocal(); });
    assert.equal(remote.state.count, 2); assert.equal(current.status, "saved");
    await act(async () => current.disconnect());
    assert.equal(current.status, "local");
    assert.equal(memory.has("nagoya-hokuriku-2027-v6-cloud-share-token"), false);
  } finally { await act(async () => tree.unmount()); globalThis.fetch = savedFetch; }
});

test("failed cloud connection keeps local edits and reports the actual error", async () => {
  memory.clear();
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "共享碼錯誤" }, { status: 403 });
  const tree = await mount();
  try {
    await act(async () => edit({ count: 4 }));
    await act(async () => { assert.equal(await current.connect("invalid"), false); });
    assert.match(current.message, /共享碼錯誤/);
    assert.equal(current.state.count, 4);
    assert.equal(JSON.parse(memory.get(localKey)).count, 4);
    assert.equal(memory.has("nagoya-hokuriku-2027-v6-cloud-share-token"), false);
  } finally { await act(async () => tree.unmount()); globalThis.fetch = savedFetch; }
});

test("edits made during an in-flight cloud write are flushed afterward", async () => {
  memory.clear();
  let remote = null, releaseFirst, writes = 0;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    if (init.method === "POST") {
      writes++;
      if (writes === 1) await new Promise(resolve => { releaseFirst = resolve; });
      remote = JSON.parse(init.body).changes[remoteKey];
      return Response.json({ ok: true });
    }
    return Response.json({ states: remote ? { [remoteKey]: remote } : {} });
  };
  const tree = await mount();
  try {
    let connecting;
    await act(async () => { connecting = current.connect("test-token"); await new Promise(resolve => setTimeout(resolve, 0)); });
    assert.equal(typeof releaseFirst, "function");
    await act(async () => edit({ count: 7 }));
    await act(async () => { releaseFirst(); await connecting; });
    assert.equal(remote.state.count, 7); assert.equal(writes, 2);
    assert.equal(current.status, "saved");
  } finally { await act(async () => tree.unmount()); globalThis.fetch = savedFetch; }
});
