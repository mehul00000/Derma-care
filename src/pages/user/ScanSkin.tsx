import { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle2, Loader2, Camera, Activity, User, Image as ImageIcon, Sparkles, ArrowRight, Info } from 'lucide-react';
import { analyzeSkinImage, ScanResult } from '../../lib/gemini';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function ScanSkin() {
  const [image, setImage] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [findingDoctors, setFindingDoctors] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [unsubscribeDoctors, setUnsubscribeDoctors] = useState<(() => void) | null>(null);

  const findDoctors = async (specialty: string) => {
    setFindingDoctors(true);
    if (unsubscribeDoctors) unsubscribeDoctors();

    try {
      const q = query(
        collection(db, 'users'), 
        where('role', '==', 'doctor'),
        where('status', '==', 'verified')
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const filtered = docs.filter((d: any) => 
          d.specialty?.toLowerCase().includes('derma') || 
          d.specialty?.toLowerCase().includes(specialty.toLowerCase().split(' ')[0])
        );
        setDoctors(filtered.length > 0 ? filtered : docs);
        setFindingDoctors(false);
      });

      setUnsubscribeDoctors(() => unsub);
    } catch (err) {
      console.error(err);
      setFindingDoctors(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeDoctors) unsubscribeDoctors();
    };
  }, [unsubscribeDoctors]);

  const requestConsultation = async (doctorId: string) => {
    if (!auth.currentUser || !scanId) return;
    try {
      await addDoc(collection(db, 'consultations'), {
        patientId: auth.currentUser.uid,
        doctorId,
        scanId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setRequestSent(doctorId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setImage(base64Data);
      setResult(null);
      setError('');
      setScanId(null);
      setDoctors([]);
      setRequestSent(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    
    try {
      const scanResult = await analyzeSkinImage(image, mimeType);
      setResult(scanResult);
      
      if (auth.currentUser) {
        const docRef = await addDoc(collection(db, 'scans'), {
          userId: auth.currentUser.uid,
          imageUrl: `data:${mimeType};base64,${image}`,
          result: scanResult,
          createdAt: new Date().toISOString()
        });
        setScanId(docRef.id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">AI Skin Analysis</h1>
          <p className="text-slate-600 font-medium">Get instant insights using advanced AI technology.</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-3d p-8 flex flex-col h-full rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-600" />
          
          <h2 className="text-2xl font-extrabold mb-8 text-slate-800 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Camera className="w-6 h-6" />
            </div>
            Capture or Upload
          </h2>
          
          <motion.div 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 group shadow-inner overflow-hidden min-h-[320px] flex flex-col items-center justify-center ${
              image ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <AnimatePresence mode="wait">
              {image ? (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative w-full h-full flex flex-col items-center gap-4"
                >
                  <img 
                    src={`data:${mimeType};base64,${image}`} 
                    alt="Uploaded skin" 
                    className="max-h-64 rounded-2xl object-cover shadow-2xl border-4 border-white" 
                  />
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-blue-600 shadow-sm border border-blue-100">
                    Click to change image
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="bg-white p-6 rounded-3xl shadow-xl mb-6 group-hover:scale-110 transition-transform duration-500 border border-slate-100">
                    <Upload className="h-12 w-12 text-blue-600" />
                  </div>
                  <p className="text-slate-900 font-extrabold text-xl mb-2">Drop your image here</p>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">PNG, JPG up to 5MB</p>
                </motion.div>
              )}
            </AnimatePresence>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </motion.div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScan}
            disabled={!image || loading}
            className={`w-full mt-8 py-4 rounded-2xl text-lg flex items-center justify-center gap-3 font-extrabold tracking-wide shadow-xl transition-all ${
              !image || loading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                Start Analysis
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </motion.button>
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 border border-red-100 shadow-inner"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3">
            <Info className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              <strong className="text-slate-700">Medical Disclaimer:</strong> This AI analysis is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician.
            </p>
          </div>
        </motion.div>

        {/* Results Section */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-3d p-8 flex flex-col h-full rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-600" />
          
          <h2 className="text-2xl font-extrabold mb-8 text-slate-800 flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
            Analysis Results
          </h2>
          
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30 p-12 text-center"
              >
                <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                  <ImageIcon className="w-12 h-12 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-600 mb-2">Ready for Analysis</h3>
                <p className="text-sm font-medium max-w-xs">
                  Upload an image of the affected skin area to receive an instant AI-powered report.
                </p>
              </motion.div>
            )}
            
            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-6 bg-slate-50/30 rounded-3xl p-12"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-xl"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-extrabold text-xl text-slate-900">AI is Thinking</p>
                  <p className="text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">Processing Image Pixels...</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="p-6 bg-white/50 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{result.diseaseName}</h3>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                      result.severity === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' :
                      result.severity === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      result.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-green-100 text-green-700 border-green-200'
                    }`}>
                      {result.severity} Severity
                    </div>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">{result.description}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Spread Method
                    </h4>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">{result.spreadMethod}</p>
                  </div>

                  <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Recommended (OTC)
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendedMedicines.map((med, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {med}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />
                  
                  <div className="relative z-10">
                    <h4 className="font-black text-xl mb-2 flex items-center gap-3">
                      <User className="w-6 h-6" />
                      Expert Consultation
                    </h4>
                    <p className="text-blue-100 text-sm mb-6 font-medium opacity-90">
                      We recommend speaking with a <span className="font-bold text-white underline underline-offset-4">{result.nearbyDoctorSpecialty}</span> for a professional diagnosis.
                    </p>
                    
                    {doctors.length === 0 ? (
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => findDoctors(result.nearbyDoctorSpecialty)}
                        disabled={findingDoctors}
                        className="w-full bg-white text-blue-600 px-6 py-4 rounded-2xl font-black tracking-wide shadow-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-3"
                      >
                        {findingDoctors ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Finding Specialists...
                          </>
                        ) : (
                          <>
                            Find Nearby Doctors
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Available Specialists</p>
                        {doctors.map(doc => (
                          <motion.div 
                            key={doc.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center group/item hover:bg-white/20 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black text-white">
                                {doc.name?.[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-white">Dr. {doc.name}</p>
                                  {doc.isOnline && <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]" />}
                                </div>
                                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">{doc.specialty}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => requestConsultation(doc.id)}
                              disabled={requestSent === doc.id}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg ${
                                requestSent === doc.id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-white text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {requestSent === doc.id ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Sent
                                </div>
                              ) : 'Consult'}
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
