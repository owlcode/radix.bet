import { useEffect, useState } from 'react';
import { getConfigs, updateConfig } from '../api';

const ORACLE_KEYS = [
  { key: 'oracle:fetch:enabled', label: 'Oracle Fetch (ESPN game discovery)' },
  { key: 'oracle:create:enabled', label: 'Oracle Create Bet (on-chain creation)' },
  { key: 'oracle:resolve:enabled', label: 'Oracle Resolve Bet (post-game resolution)' },
];

export function OracleToggle() {
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    try {
      const data = await getConfigs();
      const map: Record<string, string> = {};
      for (const c of data.configs) {
        if (c.key.startsWith('oracle:')) {
          map[c.key] = c.value;
        }
      }
      setFlags(map);
    } catch (error) {
      console.error('Failed to load oracle flags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key: string) {
    const current = flags[key] ?? 'true';
    const next = current === 'true' ? 'false' : 'true';
    try {
      await updateConfig(key, next);
      setFlags((prev) => ({ ...prev, [key]: next }));
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Oracle Control</h1>
      <div className="card">
        <h2 className="card-title">Oracle Toggles</h2>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Control which oracle operations are active. Changes take effect within 60 seconds.
        </p>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {ORACLE_KEYS.map(({ key, label }) => {
              const enabled = (flags[key] ?? 'true') === 'true';
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>
                    <span style={{
                      color: enabled ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                    }}>
                      {enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${enabled ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggle(key)}
                    >
                      {enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
