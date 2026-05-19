import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import { getClient, updateClient } from '../api/clients';
import { useToast } from '../components/Toast';

export default function ClientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getClient(id)
      .then((c) => {
        if (!cancelled) setClient(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    await updateClient(id, payload);
    showToast('Client updated', 'success');
    navigate(`/clients/${id}`);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1100px]">
        <Link to={`/clients/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to client
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">Edit Client</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        {client && (
          <ClientForm initial={client} submitLabel="Save changes" onSubmit={handleSubmit} />
        )}
      </main>
    </div>
  );
}
