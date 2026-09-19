import { useEffect, useState } from 'react';
import { getHookahTriggers, deleteAllHookahTriggers, deleteHookahTrigger } from '../api';

interface Trigger {
  id: string;
  emitterAddress?: string;
  eventName?: string;
  [key: string]: unknown;
}

export function HookahTriggers() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadTriggers() {
    try {
      setError(null);
      const data = await getHookahTriggers();
      setTriggers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load triggers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTriggers();
  }, []);

  async function handleDeleteAll() {
    if (!confirm(`Delete all ${triggers.length} triggers? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteAllHookahTriggers();
      if (result.errors && result.errors.length > 0) {
        setError(`Deleted ${result.deleted}/${result.total}. ${result.errors.length} failed: ${result.errors[0].error}`);
      }
      await loadTriggers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete triggers');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHookahTrigger(id);
      setTriggers((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete trigger ${id}`);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Hookah Triggers</h1>
        {triggers.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleDeleteAll}
            disabled={deleting}
            style={{ backgroundColor: '#f44336' }}
          >
            {deleting ? 'Deleting...' : `Delete All (${triggers.length})`}
          </button>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #f44336', padding: '12px 16px' }}>
          <strong>Error:</strong> {error}
          <br />
          <span style={{ fontSize: 12, color: '#888' }}>
            Check the event processor logs for the full Hookah auth/config error. Required vars are
            {' '}<code>HOOKAH_BASE_URL</code>, <code>HOOKAH_PUBLIC_KEY</code>, and <code>HOOKAH_PRIVATE_KEY</code>.
          </span>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Triggers ({triggers.length})</h2>
        {triggers.length === 0 ? (
          <p style={{ color: '#666' }}>No triggers found. They will be created when the event processor starts.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Trigger ID</th>
                <th>Emitter Address</th>
                <th>Event Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((trigger) => (
                <tr key={trigger.id}>
                  <td><code style={{ fontSize: 11 }}>{trigger.id}</code></td>
                  <td>
                    <code style={{ fontSize: 11 }}>
                      {trigger.emitterAddress
                        ? trigger.emitterAddress.length > 30
                          ? trigger.emitterAddress.slice(0, 30) + '...'
                          : trigger.emitterAddress
                        : '-'}
                    </code>
                  </td>
                  <td>{trigger.eventName || '-'}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDelete(trigger.id)}
                      style={{ padding: '2px 8px', fontSize: 11, color: '#f44336' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
