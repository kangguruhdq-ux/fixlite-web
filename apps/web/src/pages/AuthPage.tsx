import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { AuthCard } from '../components/AuthCard';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isRegisterPath = location.pathname.includes('register');

  const returnTo = (location.state as any)?.returnTo || '/';

  React.useEffect(() => {
    if (user) {
      navigate(returnTo);
    }
  }, [user, navigate, returnTo]);

  return (
    <div className="studio-shell flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full flex justify-center animate-slide-up">
          <AuthCard
            initialMode={isRegisterPath ? 'register' : 'login'}
            onSuccess={() => navigate(returnTo)}
          />
        </div>
      </main>
    </div>
  );
};
