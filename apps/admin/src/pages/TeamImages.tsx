import { useEffect, useState } from 'react';
import { getTeamImages, updateTeamImage, type TeamImage } from '../api';

export function TeamImages() {
  const [images, setImages] = useState<TeamImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');

  async function loadImages() {
    try {
      const data = await getTeamImages({
        sport: sportFilter || undefined,
        league: leagueFilter || undefined,
        search: search || undefined,
      });
      setImages(data);
    } catch (error) {
      console.error('Failed to load team images:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
  }, [sportFilter, leagueFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(loadImages, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleSave(id: string) {
    try {
      await updateTeamImage(id, editUrl);
      setEditingId(null);
      await loadImages();
    } catch (error) {
      console.error('Failed to update team image:', error);
    }
  }

  // Extract unique sports and leagues from loaded data
  const sports = [...new Set(images.map((i) => i.sport))].sort();
  const leagues = [...new Set(images.map((i) => i.league))].sort();

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Team Images</h1>

      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px' }}>
        <input
          type="text"
          placeholder="Search team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, flex: 1 }}
        />
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">All Sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={leagueFilter}
          onChange={(e) => setLeagueFilter(e.target.value)}
          style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
        >
          <option value="">All Leagues</option>
          {leagues.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <h2 className="card-title">Teams ({images.length})</h2>
        {images.length === 0 ? (
          <p style={{ color: '#666' }}>No team images found. Run the seed script to populate.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Team Name</th>
                <th>Sport</th>
                <th>League</th>
                <th>Image URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id}>
                  <td>
                    <img
                      src={img.imageUrl}
                      alt={img.teamName}
                      style={{ width: 32, height: 32, borderRadius: 2, objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </td>
                  <td><strong>{img.teamName}</strong></td>
                  <td>{img.sport}</td>
                  <td><code>{img.league}</code></td>
                  <td>
                    {editingId === img.id ? (
                      <input
                        type="text"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(img.id)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                          width: '100%',
                          fontSize: 11,
                          fontFamily: 'monospace',
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{ fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', color: '#0066cc' }}
                        onClick={() => { setEditingId(img.id); setEditUrl(img.imageUrl); }}
                        title="Click to edit"
                      >
                        {img.imageUrl.length > 50 ? img.imageUrl.slice(0, 50) + '...' : img.imageUrl}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === img.id ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-primary" onClick={() => handleSave(img.id)} style={{ padding: '2px 8px', fontSize: 11 }}>
                          Save
                        </button>
                        <button className="btn btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '2px 8px', fontSize: 11 }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setEditingId(img.id); setEditUrl(img.imageUrl); }}
                        style={{ padding: '2px 8px', fontSize: 11 }}
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
