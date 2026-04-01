import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Stethoscope, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar({ user, role }: { user: any, role: string | null }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="glass-3d sticky top-4 z-50 mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-white/40 shadow-xl overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 font-extrabold text-2xl text-gradient tracking-tight hover:scale-105 transition-transform duration-300">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-[0_4px_10px_rgba(59,130,246,0.5)] text-white">
                <Stethoscope className="h-6 w-6" />
              </div>
              DermaCare
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to={`/${role}/dashboard`} className="text-slate-700 hover:text-blue-600 font-bold transition-all hover:-translate-y-0.5">
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-bold bg-white/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/50 shadow-sm ml-2">
                  <div className="bg-blue-500 p-1 rounded-full text-white shadow-sm">
                    <UserIcon className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:inline">{user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-all rounded-xl shadow-sm border border-transparent hover:border-red-100 hover:scale-110"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-700 hover:text-blue-600 font-bold transition-all hover:-translate-y-0.5">Login</Link>
                <Link to="/signup" className="btn-3d btn-3d-blue px-6 py-2.5 text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
