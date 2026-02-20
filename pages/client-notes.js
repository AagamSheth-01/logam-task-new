import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft } from 'lucide-react';
import ClientNotesDashboard from '../components/dashboard/ClientNotesDashboard';

const ClientNotesPage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.replace('/');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch {
      router.replace('/');
      return;
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Client Notes | Logam</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(user?.role === 'admin' ? '/admin' : '/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Client Notes</h1>
        </header>
        <main className="max-w-5xl mx-auto py-4">
          <ClientNotesDashboard user={user} />
        </main>
      </div>
    </>
  );
};

export default ClientNotesPage;
