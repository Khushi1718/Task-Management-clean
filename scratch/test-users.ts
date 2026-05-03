import { admin } from "./src/lib/api";

async function test() {
  try {
    const res = await admin.getAllUsers(100, 0);
    console.log("Users:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
