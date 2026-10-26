// Cloudflare D1 Edge Database Client (REST API)

interface D1QueryResult<T = any> {
  results: T[];
  success: boolean;
  meta?: any;
}

interface D1ApiResponse<T = any> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export async function queryD1<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.replace(/["']/g, '').trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.replace(/["']/g, '').trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.replace(/["']/g, '').trim();

  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Cloudflare D1 credentials missing in environment variables.');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudflare D1 HTTP Error:', response.status, errorText);
    throw new Error(`Cloudflare D1 error: ${response.statusText}`);
  }

  const json: D1ApiResponse<T> = await response.json();

  if (!json.success || !json.result || json.result.length === 0) {
    const msg = json.errors?.map((e) => e.message).join(', ') || 'Query failed';
    throw new Error(`Cloudflare D1 execution error: ${msg}`);
  }

  return json.result[0].results || [];
}

export async function executeD1(
  sql: string,
  params: any[] = []
): Promise<{ success: boolean; changes?: number }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.replace(/["']/g, '').trim();
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.replace(/["']/g, '').trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.replace(/["']/g, '').trim();

  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Cloudflare D1 credentials missing in environment variables.');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sql,
      params,
    }),
    cache: 'no-store',
  });

  const json: D1ApiResponse = await response.json();

  if (!json.success) {
    const msg = json.errors?.map((e) => e.message).join(', ') || 'Execution failed';
    throw new Error(`Cloudflare D1 execution error: ${msg}`);
  }

  return {
    success: true,
    changes: json.result?.[0]?.meta?.changes || 0,
  };
}
