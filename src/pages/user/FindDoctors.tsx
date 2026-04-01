import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Activity, MapPin, User, CheckCircle, Star, Search, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function FindDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      // Sort online doctors first
      docsData.sort((a: any, b: any) => {
        if (a.isOnline === b.isOnline) return 0;
        return a.isOnline ? -1 : 1;
      });
      setDoctors(docsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRequestConsultation = async (doctorId: string) => {
    if (!auth.currentUser) return;
    setRequestingId(doctorId);
    try {
      await addDoc(collection(db, 'consultations'), {
        patientId: auth.currentUser.uid,
        doctorId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/user/dashboard');
      }, 2000);
    } catch (error) {
      console.error("Error requesting consultation:", error);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2"
          >
            Find Specialists
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 font-medium"
          >
            Connect with top dermatologists for expert skin care.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full md:w-96 group"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by name, specialty, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
          />
        </motion.div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-lg"></div>
          <p className="text-slate-500 font-medium animate-pulse">Searching for doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-3d p-12 text-center flex flex-col items-center gap-6 rounded-3xl"
        >
          <div className="bg-slate-100/50 p-6 rounded-full text-slate-400 shadow-inner">
            <User className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">No Specialists Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              We couldn't find any doctors matching your search criteria. Try adjusting your filters or search terms.
            </p>
          </div>
          <button 
            onClick={() => setSearchTerm('')}
            className="text-blue-600 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="glass-3d p-6 flex flex-col h-full rounded-3xl group relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                        <User className="h-8 w-8" />
                      </div>
                      {doctor.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                        Dr. {doctor.name}
                      </h3>
                      <p className="text-blue-600 font-semibold text-sm">
                        {doctor.specialization || 'Dermatologist'}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-slate-700">
                          {doctor.rating ? `${doctor.rating} / 5.0` : 'New Specialist'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                    doctor.isOnline 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {doctor.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-1 relative z-10">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    {doctor.location || 'Remote Consultation Available'}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    {doctor.experience || '5+'} years of experience
                  </div>

                  {doctor.reviewText && (
                    <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                      <p className="text-sm text-slate-600 italic line-clamp-2 leading-relaxed">
                        "{doctor.reviewText}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-auto relative z-10">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRequestConsultation(doctor.id)}
                    disabled={requestingId === doctor.id}
                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                      requestingId === doctor.id 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25 hover:shadow-blue-500/40'
                    }`}
                  >
                    {requestingId === doctor.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        Request Consultation
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-3d bg-white/90 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center border-0"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Request Sent!</h3>
              <p className="text-slate-600 font-medium mb-8">
                Your consultation request has been successfully sent to the specialist.
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-full bg-green-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
