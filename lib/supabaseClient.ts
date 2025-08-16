
// PRODUCTION DEPLOYMENT: Manual Supabase client without dependency issues

const SUPABASE_URL = 'https://wqxkdlcfwcuklpbznqbt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeGtkbGNmd2N1a2xwYnpucWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDk1NTcsImV4cCI6MjA0ODcyNTU1N30.hPBPCa2vNqvL1rW7mWzYfT7SdqZP0TZjP7OwZj2P9-4';

// Manual Supabase client implementation for production deployment
class SimpleSupabaseClient {
  private url: string;
  private key: string;
  private headers: Record<string, string>;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
  }

  from(table: string) {
    return new SimpleTable(this.url, table, this.headers);
  }

  auth = {
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: null })
  };
}

class SimpleTable {
  private url: string;
  private table: string;
  private headers: Record<string, string>;
  private queryParts: string[] = [];

  constructor(url: string, table: string, headers: Record<string, string>) {
    this.url = url;
    this.table = table;
    this.headers = headers;
  }

  select(columns = '*') {
    this.queryParts.push(`select=${columns}`);
    return this;
  }

  eq(column: string, value: any) {
    this.queryParts.push(`${column}=eq.${value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.queryParts.push(`order=${column}.${direction}`);
    return this;
  }

  limit(count: number) {
    this.queryParts.push(`limit=${count}`);
    return this;
  }

  single() {
    this.queryParts.push('limit=1');
    return this;
  }

  async insert(data: any) {
    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });
      return { data: await response.json(), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async update(data: any) {
    try {
      const query = this.queryParts.length > 0 ? '?' + this.queryParts.join('&') : '';
      const response = await fetch(`${this.url}/rest/v1/${this.table}${query}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(data)
      });
      return { data: await response.json(), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async delete() {
    try {
      const query = this.queryParts.length > 0 ? '?' + this.queryParts.join('&') : '';
      const response = await fetch(`${this.url}/rest/v1/${this.table}${query}`, {
        method: 'DELETE',
        headers: this.headers
      });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Execute the query for SELECT operations
  async then(resolve: any, reject?: any) {
    try {
      const query = this.queryParts.length > 0 ? '?' + this.queryParts.join('&') : '';
      const response = await fetch(`${this.url}/rest/v1/${this.table}${query}`, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        const error = { message: `HTTP ${response.status}` };
        return resolve({ data: null, error });
      }
      
      const data = await response.json();
      return resolve({ data, error: null });
    } catch (error) {
      return resolve({ data: null, error });
    }
  }
}

let supabaseClient: any = null;

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    console.log('🚫 Server-side detected, returning null');
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = new SimpleSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Manual Supabase client created successfully');
    } catch (error) {
      console.error('❌ Manual Supabase client creation failed:', error);
      return null;
    }
  }

  return supabaseClient;
}

export default getSupabaseClient
