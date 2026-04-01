import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Mail, Lock, User, Stethoscope, AlertCircle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
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
    } catch (err: any) {
      setError(err.message);
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

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      // 1. Verify OTP
      const verifyResponse = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.error || 'Invalid verification code');

      // 2. Create Firebase Account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const isAdminEmail = email.toLowerCase() === 'admin123@gmail.com';
      const finalRole = isAdminEmail ? 'admin' : role;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        role: finalRole,
        specialty: finalRole === 'doctor' ? specialty : null,
        status: finalRole === 'doctor' ? 'pending' : 'active',
        createdAt: new Date().toISOString()
      });
      
      toast.success('Account created successfully!');
      window.location.href = `/${finalRole}/dashboard`;
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-skin-overlay rounded-3xl mt-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full glass-3d p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500"></div>
        
        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="text-center mb-10 relative z-10">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mx-auto mb-6 flex items-center justify-center text-white"
                >
                  <UserPlus className="w-10 h-10" />
                </motion.div>
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Create Account</h2>
                <p className="text-slate-500 font-bold">Join DermaCare today</p>
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

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium text-slate-800"
                      placeholder="your name"
                    />
                  </div>
                </div>

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

                <div className="space-y-2">
                  <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider">I am a...</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner font-bold text-slate-800"
                  >
                    <option value="user">Patient</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                {role === 'doctor' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="block text-sm font-extrabold text-slate-700 uppercase tracking-wider">Specialty</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Dermatologist"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium text-slate-800"
                      />
                    </div>
                  </motion.div>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-3d btn-3d-blue py-4 mt-4 text-lg tracking-wide flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="w-5 h-5" />
                    </>
                  )}
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
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mx-auto mb-6 flex items-center justify-center text-white"
                >
                  <ShieldCheck className="w-10 h-10" />
                </motion.div>
                <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Verify Email</h2>
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

              <form onSubmit={handleVerifyAndSignup} className="space-y-6">
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
                  ) : 'Verify & Create Account'}
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
                    onClick={() => setStep('details')}
                    className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back to details
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-center text-sm font-bold text-slate-600 relative z-10">
          Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700 hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}
