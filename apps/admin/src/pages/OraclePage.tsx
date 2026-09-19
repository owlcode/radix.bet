import { useEffect, useState, useCallback } from 'react';
import { getOracleGames, getOracleStats, triggerOracleFetch, type OracleGame } from '../api';

interface OraclePageProps {
  oracleId: string;
  title: string;
  leagues?: string[];
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'DISCOVERED', label: 'Discovered' },
  { value: 'BET_CREATED', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'BET_FAILED', label: 'Failed' },
  { value: 'RESOLUTION_FAILED', label: 'Resolve Failed' },
];

const STOKENET_EXPLORER = 'https://stokenet-dashboard.radixdlt.com';

export function OraclePage({ oracleId, title, leagues }: OraclePageProps) {
  const [games, setGames] = useState<OracleGame[]>([]);
  const [stats, setStats] = useState({ total: 0, discovered: 0, active: 0, resolved: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    try {
      const [gamesData, statsData] = await Promise.all([
        getOracleGames({
          oracleId,
          status: statusFilter || undefined,
          league: leagueFilter || undefined,
          page,
          pageSize,
        }),
        getOracleStats(oracleId),
      ]);
      setGames(gamesData.games);
      setTotal(gamesData.total);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load oracle data:', error);
    } finally {
      setLoading(false);
    }
  }, [oracleId, statusFilter, leagueFilter, page]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10_000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, leagueFilter, oracleId]);

  async function handleFetchNow() {
    try {
      await triggerOracleFetch(oracleId);
      setTimeout(loadData, 2000);
    } catch (error) {
      console.error('Failed to trigger fetch:', error);
    }
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      DISCOVERED: '#2196f3',
      BET_CREATED: '#4caf50',
      RESOLVED: '#9e9e9e',
      BET_FAILED: '#f44336',
      RESOLUTION_FAILED: '#ff9800',
    };
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          backgroundColor: colors[status] || '#666',
        }}
      >
        {status.replace('_', ' ')}
      </span>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">{title}</h1>
        <button className="btn btn-primary" onClick={handleFetchNow}>
          Trigger Fetch Now
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: '#333' },
          { label: 'Discovered', value: stats.discovered, color: '#2196f3' },
          { label: 'Active', value: stats.active, color: '#4caf50' },
          { label: 'Resolved', value: stats.resolved, color: '#9e9e9e' },
          { label: 'Failed', value: stats.failed, color: '#f44336' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px' }}>
        <span style={{ fontSize: 13, color: '#666' }}>Status:</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`btn ${statusFilter === f.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(f.value)}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {f.label}
          </button>
        ))}
        {leagues && (
          <>
            <span style={{ fontSize: 13, color: '#666', marginLeft: 10 }}>League:</span>
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
            >
              <option value="">All Leagues</option>
              {leagues.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Games table */}
      <div className="card">
        <h2 className="card-title">Games ({total})</h2>
        {games.length === 0 ? (
          <p style={{ color: '#666' }}>No games found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Home</th>
                <th>Away</th>
                <th>League</th>
                <th>Start Time</th>
                <th>Status</th>
                <th>Winner</th>
                <th>Component</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {game.homeTeamLogo && (
                        <img src={game.homeTeamLogo} alt="" style={{ width: 20, height: 20, borderRadius: 2 }} />
                      )}
                      {game.homeTeamName}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {game.awayTeamLogo && (
                        <img src={game.awayTeamLogo} alt="" style={{ width: 20, height: 20, borderRadius: 2 }} />
                      )}
                      {game.awayTeamName}
                    </div>
                  </td>
                  <td><code>{game.league}</code></td>
                  <td>{new Date(game.startTime).toLocaleString()}</td>
                  <td>{statusBadge(game.status)}</td>
                  <td>{game.winnerTeam || '-'}</td>
                  <td>
                    {game.betComponentAddress ? (
                      <a
                        href={`${STOKENET_EXPLORER}/component/${game.betComponentAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, fontFamily: 'monospace' }}
                      >
                        {game.betComponentAddress.slice(0, 20)}...
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Prev
            </button>
            <span style={{ fontSize: 13, lineHeight: '28px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
