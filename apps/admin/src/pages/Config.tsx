import { useEffect, useState } from 'react';
import { getConfigs, updateConfig } from '../api';

interface ConfigEntry {
  key: string;
  value: string;
  updatedAt: string;
}

export default function Config() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const data = await getConfigs();
      setConfigs(data.configs);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(key: string) {
    try {
      await updateConfig(key, editValue);
      setEditingKey(null);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  }

  async function handleAdd() {
    if (!newKey.trim()) return;
    try {
      await updateConfig(newKey, newValue);
      setNewKey('');
      setNewValue('');
      await loadConfigs();
    } catch (error) {
      console.error('Failed to add config:', error);
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Configuration</h1>

      <div className="card">
        <h2 className="card-title">Add New Config</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, flex: 1 }}
          />
          <input
            type="text"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, flex: 2 }}
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Current Configuration</h2>
        {configs.length === 0 ? (
          <p style={{ color: '#666' }}>No configuration entries found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.key}>
                  <td>
                    <code>{config.key}</code>
                  </td>
                  <td>
                    {editingKey === config.key ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                          width: '100%'
                        }}
                      />
                    ) : (
                      <code>{config.value}</code>
                    )}
                  </td>
                  <td>{new Date(config.updatedAt).toLocaleString()}</td>
                  <td>
                    {editingKey === config.key ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleUpdate(config.key)}
                        >
                          Save
                        </button>
                        <button className="btn btn-secondary" onClick={() => setEditingKey(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingKey(config.key);
                          setEditValue(config.value);
                        }}
                      >
                        Edit
                      </button>
                    )}
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
