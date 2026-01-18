import { headers } from 'next/headers';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';

async function getServiceStatus() {
  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList);

  await log('info', 'Home page rendered (SSR)', logId);

  return {
    service: 'webservice',
    status: 'ok',
    timestamp: new Date().toISOString(),
    logId: logId || 'N/A',
  };
}

export default async function Home() {
  const status = await getServiceStatus();

  return (
    <main style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{
        color: '#333',
        marginBottom: '8px',
      }}>
        3E Data Toolkit
      </h1>
      <p style={{
        color: '#666',
        marginBottom: '40px',
      }}>
        Microservices Architecture Demo
      </p>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
      }}>
        <h2 style={{
          color: '#333',
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '18px',
        }}>
          Service Status
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '8px 16px',
          fontSize: '14px',
        }}>
          <span style={{ color: '#666' }}>Service:</span>
          <span style={{ color: '#333' }}>{status.service}</span>

          <span style={{ color: '#666' }}>Status:</span>
          <span style={{
            color: status.status === 'ok' ? '#22c55e' : '#ef4444',
            fontWeight: 500,
          }}>
            {status.status.toUpperCase()}
          </span>

          <span style={{ color: '#666' }}>Timestamp:</span>
          <span style={{ color: '#333', fontFamily: 'monospace', fontSize: '13px' }}>
            {status.timestamp}
          </span>

          <span style={{ color: '#666' }}>Log ID:</span>
          <span style={{ color: '#333', fontFamily: 'monospace', fontSize: '13px' }}>
            {status.logId}
          </span>
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{
          color: '#333',
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '18px',
        }}>
          Architecture Overview
        </h2>
        <ul style={{
          margin: 0,
          padding: '0 0 0 20px',
          color: '#666',
          lineHeight: 1.8,
        }}>
          <li><strong>Proxy (Caddy)</strong> - Request routing and tracing</li>
          <li><strong>Webservice (Next.js)</strong> - SSR application</li>
          <li><strong>Telemetry (Go)</strong> - Centralized logging</li>
          <li><strong>Heartbeat (Go)</strong> - Health monitoring</li>
        </ul>
      </div>

      <p style={{
        color: '#999',
        fontSize: '12px',
        marginTop: '40px',
        textAlign: 'center',
      }}>
        This page was server-side rendered with Next.js
      </p>
    </main>
  );
}
