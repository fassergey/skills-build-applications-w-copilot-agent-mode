import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  _id?: string;
  name: string;
  mascot?: string;
  members: Array<string | { _id?: string; name?: string }>;
};

type TeamsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; teams: Team[] };

export default function Teams() {
  const [state, setState] = useState<TeamsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ status: 'loaded', teams });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {state.status === 'loading' && <p role="status">Loading teams…</p>}
        {state.status === 'error' && <p role="alert">Unable to load teams.</p>}
        {state.status === 'loaded' && state.teams.length === 0 && (
          <p role="status">No teams yet.</p>
        )}
        {state.status === 'loaded' && state.teams.length > 0 && (
          <ul className="list-group" aria-label="Teams">
            {state.teams.map((team, index) => (
              <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
                <h3 className="h5">{team.name}</h3>
                {team.mascot && <p>Mascot: {team.mascot}</p>}
                <p>
                  Members: {team.members.map((member) => (
                    typeof member === 'string' ? member : member.name ?? member._id ?? 'Member'
                  )).join(', ') || 'None'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
