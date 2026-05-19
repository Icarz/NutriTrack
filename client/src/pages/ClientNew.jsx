import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import { createClient } from '../api/clients';
import { useToast } from '../components/Toast';

export default function ClientNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSubmit(payload) {
    const created = await createClient(payload);
    showToast('Client created', 'success');
    navigate(`/clients/${created.id}`);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1100px]">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to clients
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">New Client</h1>
        <ClientForm submitLabel="Save client" onSubmit={handleSubmit} />
      </main>
    </div>
  );
}
