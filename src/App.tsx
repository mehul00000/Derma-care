/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Toaster } from 'sonner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserDashboard from './pages/user/Dashboard';
import ScanSkin from './pages/user/ScanSkin';
import FindDoctors from './pages/user/FindDoctors';
import DoctorDashboard from './pages/doctor/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const isAdminEmail = currentUser.email?.toLowerCase() === 'admin123@gmail.com';
            setRole(isAdminEmail ? 'admin' : docSnap.data().role);
          } else {
            const isAdminEmail = currentUser.email?.toLowerCase() === 'admin123@gmail.com';
            setRole(isAdminEmail ? 'admin' : 'user');
          }
        } catch (error: any) {
          console.error("Error fetching user role:", error);
          const isAdminEmail = currentUser.email?.toLowerCase() === 'admin123@gmail.com';
          setRole(isAdminEmail ? 'admin' : 'user');
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-skin-overlay text-slate-900 font-sans flex flex-col relative overflow-x-hidden">
        {/* Decorative elements */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none z-0" />
        
        {role !== 'admin' && <Navbar user={user} role={role} />}
        <main className={`${role !== 'admin' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full" : "flex-1 w-full flex flex-col"} relative z-10`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={user ? (role ? <Navigate to={`/${role}/dashboard`} /> : <div className="min-h-screen flex items-center justify-center">Loading...</div>) : <Login />} />
            <Route path="/signup" element={user ? (role ? <Navigate to={`/${role}/dashboard`} /> : <div className="min-h-screen flex items-center justify-center">Loading...</div>) : <Signup />} />
            
            {/* User Routes */}
            <Route path="/user/dashboard" element={user && role === 'user' ? <UserDashboard /> : <Navigate to="/login" />} />
            <Route path="/user/scan" element={user && role === 'user' ? <ScanSkin /> : <Navigate to="/login" />} />
            <Route path="/user/doctors" element={user && role === 'user' ? <FindDoctors /> : <Navigate to="/login" />} />
            
            {/* Doctor Routes */}
            <Route path="/doctor/dashboard" element={user && role === 'doctor' ? <DoctorDashboard /> : <Navigate to="/login" />} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={user && role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
