import { useNavigate } from 'react-router-dom';
import GoalProgressBar from './GoalProgressBar';
import Badge from './Badge';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function ClientRow({ client }) {
  const navigate = useNavigate();
  const status = client.is_overdue && client.status === 'active' ? 'overdue' : client.status;

  return (
    <tr
      onClick={() => navigate(`/clients/${client.id}`)}
      className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
            {initials(client.name)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{client.name}</div>
            <div className="text-xs text-gray-500">
              {client.email || client.phone || '—'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <GoalProgressBar
          startWeight={client.start_weight}
          currentWeight={client.current_weight ?? client.start_weight}
          targetWeight={client.target_weight ?? null}
          targetDate={null}
          createdAt={client.created_at}
          showDetails={false}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(client.last_log_date)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {client.current_weight ?? client.start_weight ?? '—'}
      </td>
      <td className="px-4 py-3"><Badge status={status} /></td>
    </tr>
  );
}
