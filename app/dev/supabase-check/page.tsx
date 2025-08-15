'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-services';

interface HealthCheckResult {
  timestamp: string;
  supabaseConnected: boolean;
  envVariables: {
    url: string;
    keyPresent: boolean;
  };
  testQuery: {
    success: boolean;
    error?: string;
    data?: any;
  };
  authTest: {
    success: boolean;
    error?: string;
    session?: any;
  };
}

export default function SupabaseHealthCheck() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setLoading(true);
    
    const healthCheck: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      supabaseConnected: !!supabase,
      envVariables: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        keyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      testQuery: {
        success: false
      },
      authTest: {
        success: false
      }
    };

    // Test basic query
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alt_projeler')
          .select('id, alt_proje_adi')
          .limit(1);
        
        if (error) {
          healthCheck.testQuery = {
            success: false,
            error: `Query failed: ${error.message}`
          };
        } else {
          healthCheck.testQuery = {
            success: true,
            data: data
          };
        }
      } catch (error: any) {
        healthCheck.testQuery = {
          success: false,
          error: `Query exception: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      // Test auth
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          healthCheck.authTest = {
            success: false,
            error: `Auth failed: ${error.message}`
          };
        } else {
          healthCheck.authTest = {
            success: true,
            session: session ? 'Session exists' : 'No session'
          };
        }
      } catch (error: any) {
        healthCheck.authTest = {
          success: false,
          error: `Auth exception: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    setResult(healthCheck);
    setLoading(false);
  };

  const getStatusColor = (success: boolean) => success ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Supabase Health Check</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4">Checking Supabase connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Health Check</h1>
        
        {result && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Basic Connection</h2>
              <div className="space-y-2">
                <p><strong>Timestamp:</strong> {result.timestamp}</p>
                <p><strong>Supabase Client:</strong> 
                  <span className={getStatusColor(result.supabaseConnected)}>
                    {getStatusIcon(result.supabaseConnected)} {result.supabaseConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </p>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
              <div className="space-y-2">
                <p><strong>SUPABASE_URL:</strong> {result.envVariables.url}</p>
                <p><strong>SUPABASE_ANON_KEY:</strong> 
                  <span className={getStatusColor(result.envVariables.keyPresent)}>
                    {getStatusIcon(result.envVariables.keyPresent)} {result.envVariables.keyPresent ? 'Present' : 'Missing'}
                  </span>
                </p>
              </div>
            </div>

            {/* Test Query */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Database Query Test</h2>
              <p><strong>Status:</strong> 
                <span className={getStatusColor(result.testQuery.success)}>
                  {getStatusIcon(result.testQuery.success)} {result.testQuery.success ? 'Success' : 'Failed'}
                </span>
              </p>
              {result.testQuery.error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{result.testQuery.error}</p>
                </div>
              )}
              {result.testQuery.data && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 text-sm">Query returned {result.testQuery.data.length} records</p>
                  <pre className="text-xs mt-2 text-gray-600">{JSON.stringify(result.testQuery.data, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Auth Test */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Authentication Test</h2>
              <p><strong>Status:</strong> 
                <span className={getStatusColor(result.authTest.success)}>
                  {getStatusIcon(result.authTest.success)} {result.authTest.success ? 'Success' : 'Failed'}
                </span>
              </p>
              {result.authTest.error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">{result.authTest.error}</p>
                </div>
              )}
              {result.authTest.session && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-sm">{result.authTest.session}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <button
                onClick={runHealthCheck}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Recheck
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}