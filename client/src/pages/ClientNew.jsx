import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import { createClient } from '../api/clients';
import { useToast } from '../components/Toast';

export default function ClientNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = 'New Client | NutriTrack';
  }, []);

  async function handleSubmit(payload) {
    const created = await createClient(payload);
    showToast(t('clientForm.newClient'), 'success');
    navigate(`/clients/${created.id}`);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1100px]">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← {t('common.backToClients')}
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">{t('clientForm.newClient')}</h1>
        <ClientForm submitLabel={t('clientForm.save')} onSubmit={handleSubmit} />
      </main>
    </div>
  );
}
