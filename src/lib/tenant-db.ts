import "server-only";
import { Pool, type PoolClient } from "pg";

const globalForPg = globalThis as unknown as {
  tenantPool: Pool | undefined;
};

function getTenantPool() {
  if (globalForPg.tenantPool) {
    return globalForPg.tenantPool;
  }

  const connectionString = process.env.TENANT_DATABASE_URL;

  if (!connectionString) {
    throw new Error("TENANT_DATABASE_URL is not configured.");
  }

  const pool = new Pool({
    connectionString,
    max: 10,
  });

  globalForPg.tenantPool = pool;

  return pool;
}

export async function withTenant<T>(
  tenantId: number,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error("Invalid tenant ID.");
  }

  const client = await getTenantPool().connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "SELECT set_config('app.current_tenant_id', $1, true)",
      [String(tenantId)]
    );

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}