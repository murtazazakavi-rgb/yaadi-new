const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_gflmuGo1b3nX@ep-small-darkness-ajzzcgba.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function test() {
  try {
    console.log("Running sql.query...");
    const res = await sql.query("SELECT * FROM tenants WHERE email = $1", ['admin@yaadi.com']);
    console.log("Response keys:", Object.keys(res));
    console.log("Response rows length:", res.rows?.length);
    console.log("Rows details:", res.rows);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
