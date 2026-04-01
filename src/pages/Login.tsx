import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLoginInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Verify credentials with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Check user role (only doctor and patient need OTP as per request)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      const isAdminEmail = email.toLowerCase() === 'admin123@gmail.com';
      const effectiveRole = isAdminEmail ? 'admin' : (userData?.role || 'user');

      if (effectiveRole === 'user' || effectiveRole === 'doctor') {
        // 3. Send OTP
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send OTP');

        toast.success('Verification code sent to your email');
        setStep('otp');
        setResendTimer(60);
      } else {
        // Admin or other roles might not need OTP (as per request "only for doctor and patient")
        // But usually admin should have it too. The request says "only for doctor and patient".
        window.location.href = `/${effectiveRole}/dashboard`;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
      // If we signed in but need OTP, we are technically "in", but we'll sign out if OTP fails or is cancelled
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to resend OTP');

      toast.success('New verification code sent');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid verification code');

      // Success! Redirect based on role
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const isAdminEmail = user.email?.toLowerCase() === 'admin123@gmail.com';
        const effectiveRole = isAdminEmail ? 'admin' : (userData?.role || 'user');
        toast.success('Login successful!');
        window.location.href = `/${effectiveRole}/dashboard`;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleBack = async () => {
    await signOut(auth);
    setStep('credentials');
    setOtp('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-skin-overlay rounded-3xl mt-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full glass-3d p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-10 relative z-10">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mx-auto mb-6 flex items-center justify-center text-white"
                >
                  <LogIn className="w-10 h-10" />
                </motion.div>
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 font-bold">Log in to your DermaCare account</p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLoginInit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium text-slate-800"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium text-slate-800"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-3d btn-3d-blue py-4 mt-4 text-lg tracking-wide flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : 'Login'}
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-10 relative z-10">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mx-auto mb-6 flex items-center justify-center text-white"
                >
                  <ShieldCheck className="w-10 h-10" />
                </motion.div>
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Two-Step Login</h2>
                <p className="text-slate-500 font-bold">Enter the 6-digit code sent to {email}</p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider text-center">Verification Code</label>
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-3xl tracking-[1em] font-black py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner text-slate-800"
                    placeholder="000000"
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={verifying}
                  className="w-full btn-3d btn-3d-blue py-4 mt-4 text-lg tracking-wide flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : 'Verify & Login'}
                </motion.button>

                <div className="flex flex-col gap-4">
                  <button 
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className={`w-full text-center text-sm font-bold transition-colors ${
                      resendTimer > 0 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                  </button>

                  <button 
                    type="button"
                    onClick={handleBack}
                    className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-center text-sm font-bold text-slate-600 relative z-10">
          Don't have an account? <Link to="/signup" className="text-blue-600 hover:text-blue-700 hover:underline">Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
}
