import { Link } from 'react-router-dom';
import { Camera, History, User, MessageSquare, Send, CheckCircle, Search, Image as ImageIcon, PhoneOff, Star, Clock, Sparkles, Flag, X, Edit2, Phone, FileText, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import ContactUs from '../../components/ContactUs';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UserData, ScanData, ConsultationData, MessageData } from '../../types';

export default function UserDashboard() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [consultations, setConsultations] = useState<ConsultationData[]>([]);
  const [doctors, setDoctors] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  // Chat Modal State
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    consultationId: string;
    doctorName: string;
    status: string;
  } | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reporting State
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    targetId: string;
    consultationId: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Re-consult State
  const [showReconsultSuccess, setShowReconsultSuccess] = useState(false);

  // Scan Details State
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Profile Edit State
  const [profileModal, setProfileModal] = useState({
    isOpen: false,
    name: '',
    bio: '',
    phone: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Real-time listener for user data
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data() as UserData;
        setUserData(data);
        setProfileModal(prev => ({
          ...prev,
          name: data.name || '',
          bio: data.bio || '',
          phone: data.phone || ''
        }));
      }
    });

    // Real-time listener for scans
    const qScans = query(
      collection(db, 'scans'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeScans = onSnapshot(qScans, (snapshot) => {
      setScans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanData)));
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching scans:", error);
      if (error.message?.includes('requires an index')) {
        const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        if (match) {
          setIndexError(match[0]);
        }
      }
    });

    // Real-time listener for consultations
    const qConsults = query(
      collection(db, 'consultations'),
      where('patientId', '==', user.uid)
    );
    const unsubscribeConsults = onSnapshot(qConsults, async (snapshot) => {
      const consultsWithDocs = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data() as ConsultationData;
        let doctorName = 'Unknown Doctor';
        if (data.doctorId) {
          try {
            const docRef = await getDoc(doc(db, 'users', data.doctorId));
            if (docRef.exists()) {
              doctorName = docRef.data().name;
            }
          } catch (e) {}
        }
        return { id: d.id, ...data, doctorName } as ConsultationData;
      }));
      
      consultsWithDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setConsultations(consultsWithDocs);
    });

    // Listen to doctors for real-time online status
    const qDoctors = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const unsubscribeDoctors = onSnapshot(qDoctors, (snapshot) => {
      const docsMap: Record<string, UserData> = {};
      snapshot.docs.forEach(d => {
        docsMap[d.id] = { id: d.id, ...d.data() } as UserData;
      });
      setDoctors(docsMap);
    });

    return () => {
      unsubscribeUser();
      unsubscribeScans();
      unsubscribeConsults();
      unsubscribeDoctors();
    };
  }, []);

  useEffect(() => {
    if (!chatModal?.isOpen) return;
    const q = query(
      collection(db, 'messages'),
      where('consultationId', '==', chatModal.consultationId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      msgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [chatModal?.isOpen, chatModal?.consultationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!newMessage.trim() || !user || !chatModal) return;
    try {
      await addDoc(collection(db, 'messages'), {
        consultationId: chatModal.consultationId,
        senderId: user.uid,
        text: newMessage,
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error('Failed to send message.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const user = auth.currentUser;
    const file = e.target.files?.[0];
    if (!file || !user || !chatModal) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await addDoc(collection(db, 'messages'), {
          consultationId: chatModal.consultationId,
          senderId: user.uid,
          text: 'Sent an image',
          imageUrl: base64String,
          createdAt: new Date().toISOString()
        });
        toast.success('Image sent.');
      } catch (error) {
        console.error("Error sending image:", error);
        toast.error('Failed to send image.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEndChat = async () => {
    if (!chatModal) return;
    try {
      await updateDoc(doc(db, 'consultations', chatModal.consultationId), {
        status: 'completed'
      });
      await addDoc(collection(db, 'messages'), {
        consultationId: chatModal.consultationId,
        senderId: 'system',
        text: 'Patient has ended the chat and disconnected.',
        createdAt: new Date().toISOString()
      });
      setChatModal(prev => prev ? { ...prev, status: 'completed' } : null);
      setConsultations(prev => prev.map(c => c.id === chatModal.consultationId ? { ...c, status: 'completed' } : c));
      toast.success('Consultation ended.');
    } catch (error) {
      console.error("Error ending chat:", error);
      toast.error('Failed to end chat.');
    }
  };

  if (indexError) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-orange-200 max-w-2xl mx-auto mt-12 text-center">
        <h2 className="text-2xl font-bold text-orange-600 mb-4">Database Index Required</h2>
        <p className="text-slate-700 mb-6">
          Firestore requires a special index to sort your scans by date. This is a one-time setup step.
        </p>
        <a 
          href={indexError} 
          target="_blank" 
          rel="noreferrer"
          className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors mb-4"
        >
          Click Here to Create Index
        </a>
        <p className="text-sm text-slate-500">
          After clicking the link, click "Create Index" in the Firebase console. It takes about 1-2 minutes to build. Once it says "Enabled", refresh this page!
        </p>
      </div>
    );
  }

  const handleReconsult = async (doctorId: string, scanId?: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const consultationData: Partial<ConsultationData> = {
        patientId: user.uid,
        doctorId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      if (scanId) {
        consultationData.scanId = scanId;
      }
      await addDoc(collection(db, 'consultations'), consultationData);
      setShowReconsultSuccess(true);
      toast.success('Re-consultation request sent!');
    } catch (error) {
      console.error("Error sending re-consultation request:", error);
      toast.error('Failed to send re-consultation request.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !reportModal) return;
    
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        reportedUserId: reportModal.targetId,
        consultationId: reportModal.consultationId,
        reporterRole: 'patient',
        reportedRole: 'doctor',
        reason: reportReason,
        description: reportDescription,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setReportModal(null);
      setReportReason('');
      setReportDescription('');
      toast.success('Report submitted successfully. Admin will review it shortly.');
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        name: profileModal.name,
        bio: profileModal.bio,
        phone: profileModal.phone
      };
      await updateDoc(userRef, updatedData);
      setUserData((prev) => prev ? { ...prev, ...updatedData } : null);
      setProfileModal(prev => ({ ...prev, isOpen: false }));
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
            Patient <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-slate-500 font-medium">Welcome back! Manage your skin health and consultations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Active</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/user/scan" className="btn-3d btn-3d-blue p-8 flex flex-col items-center justify-center text-center gap-4 h-full group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-white/20 transition-colors" />
            <div className="bg-white/20 p-5 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <Camera className="h-10 w-10 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">New Skin Scan</span>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <Link to="/user/doctors" className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full group border-t-4 border-t-indigo-500">
            <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]">
              <Search className="h-10 w-10" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">Find Doctors</span>
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <div className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full group border-t-4 border-t-purple-500">
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(168,85,247,0.4)]">
              <History className="h-10 w-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900">{scans.length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Scans</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <button 
            onClick={() => setProfileModal(prev => ({ ...prev, isOpen: true }))}
            className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full w-full group border-t-4 border-t-slate-800"
          >
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(30,41,59,0.4)]">
              <User className="h-10 w-10" />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tight">Edit Profile</span>
          </button>
        </motion.div>
      </div>

      <div className="space-y-8">
        <section className="glass-3d p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Health Tip
              </h3>
              <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                "Consistent skin checks can help detect issues early. Always use sunscreen with at least SPF 30, even on cloudy days."
              </p>
            </div>
            <Link to="/user/scan" className="btn-3d btn-3d-blue px-8 py-3 text-sm whitespace-nowrap">Start Daily Check</Link>
          </div>
        </section>
          {consultations.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  Consultations
                </h2>
              </div>
              <div className="glass-3d overflow-hidden border-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200/50">
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Date</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Doctor</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {consultations.map((c) => {
                        const doctorData = doctors[c.doctorId];
                        const isOnline = doctorData?.isOnline || false;
                        
                        return (
                          <tr key={c.id} className="hover:bg-white/40 transition-colors group">
                            <td className="p-5 text-sm font-bold text-slate-600">
                              {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold shadow-inner">
                                  {c.doctorName.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">Dr. {c.doctorName}</span>
                                    {isOnline && (
                                      <span className="flex h-2 w-2 relative" title="Online">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                      </span>
                                    )}
                                  </div>
                                  {doctorData?.rating && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-yellow-600 uppercase">
                                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                      {doctorData.rating} Rating
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                c.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                c.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                c.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-5">
                              {c.status === 'accepted' ? (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setChatModal({ isOpen: true, consultationId: c.id, doctorName: c.doctorName, status: c.status })}
                                    className="btn-3d btn-3d-blue px-4 py-2 text-[10px] flex items-center gap-2"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Join Chat
                                  </button>
                                  <button 
                                    onClick={() => setReportModal({ isOpen: true, targetId: c.doctorId, consultationId: c.id })}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Report Doctor"
                                  >
                                    <Flag className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : c.status === 'completed' ? (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setChatModal({ isOpen: true, consultationId: c.id, doctorName: c.doctorName, status: c.status })}
                                    className="btn-3d btn-3d-white px-4 py-2 text-[10px] flex items-center gap-2"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                    History
                                  </button>
                                  <button 
                                    onClick={() => handleReconsult(c.doctorId, c.scanId)}
                                    className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                  >
                                    Re-consult
                                  </button>
                                </div>
                              ) : c.status === 'rejected' ? (
                                <button 
                                  onClick={() => handleReconsult(c.doctorId, c.scanId)}
                                  className="btn-3d btn-3d-white px-4 py-2 text-[10px]"
                                >
                                  Try Again
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Clock className="w-4 h-4 animate-pulse" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Waiting...</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Camera className="w-6 h-6 text-blue-600" />
                Recent Scans
              </h2>
              <Link to="/user/scan" className="text-blue-600 font-bold text-sm hover:underline">View All</Link>
            </div>
            <div className="glass-3d overflow-hidden border-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>Analyzing history...</span>
                </div>
              ) : scans.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-6">
                  <div className="bg-slate-100 p-6 rounded-3xl text-slate-300 shadow-inner">
                    <Camera className="w-12 h-12" />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-slate-900 font-black text-lg mb-2">No scans yet</p>
                    <p className="text-slate-500 text-sm font-medium mb-6">Start your first AI skin analysis to monitor your health.</p>
                    <Link to="/user/scan" className="btn-3d btn-3d-blue px-8 py-3">Take First Scan</Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200/50">
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Date</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Detection</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Severity</th>
                        <th className="p-5 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50">
                      {scans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-white/40 transition-colors group">
                          <td className="p-5 text-sm font-bold text-slate-600">
                            {new Date(scan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              {scan.imageUrl ? (
                                <img src={scan.imageUrl} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-white/50" alt="Scan" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <span className="font-bold text-slate-900">{scan.result.diseaseName}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                              scan.result.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                              scan.result.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              scan.result.severity === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              {scan.result.severity}
                            </span>
                          </td>
                          <td className="p-5">
                            <button 
                              onClick={() => setSelectedScan(scan)}
                              className="btn-3d btn-3d-white px-4 py-2 text-[10px]"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
      </div>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {profileModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-3d rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border-0"
            >
              <button 
                onClick={() => setProfileModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-100/50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-100 p-3 rounded-2xl">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Profile</h3>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={profileModal.name}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profileModal.phone}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Personal Bio</label>
                  <textarea 
                    value={profileModal.bio}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all shadow-inner"
                  ></textarea>
                </div>
                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setProfileModal(prev => ({ ...prev, isOpen: false }))} 
                    className="flex-1 px-6 py-4 text-slate-600 hover:bg-slate-100/50 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-transparent hover:border-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 btn-3d btn-3d-blue px-6 py-4 text-xs disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      {chatModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Chat with Dr. {chatModal.doctorName}
                </h3>
                <p className="text-xs text-slate-500">
                  {chatModal.status === 'completed' ? 'This consultation has ended. Chat is read-only.' : 'Active Consultation'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {chatModal.status === 'accepted' && (
                  <button 
                    onClick={handleEndChat}
                    className="flex items-center gap-1 text-xs font-medium bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    End Chat
                  </button>
                )}
                <button 
                  onClick={() => setChatModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map(msg => {
                  const isSystem = msg.senderId === 'system';
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-4">
                        <span className="bg-slate-200 text-slate-600 text-xs px-4 py-1.5 rounded-full font-medium">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Shared" className="max-w-full rounded-lg mb-2 mt-1" />
                        )}
                        {msg.text && msg.text !== 'Sent an image' && <p className="text-sm">{msg.text}</p>}
                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {chatModal.status === 'accepted' ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-blue-600 p-2 transition-colors shrink-0"
                  title="Send Image"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center w-10 h-10 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-slate-200 bg-slate-100 text-center text-sm text-slate-500 italic">
                This consultation is {chatModal.status}. You cannot send new messages.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setReportModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Report Doctor
            </h3>
            <form onSubmit={handleReportSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Report</label>
                <select 
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select a reason...</option>
                  <option value="Inappropriate Behavior">Inappropriate Behavior</option>
                  <option value="Unprofessional Conduct">Unprofessional Conduct</option>
                  <option value="Spam or Scam">Spam or Scam</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  required
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={4}
                  placeholder="Please provide details about the issue..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setReportModal(null)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Details Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedScan(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Scan Details</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                {selectedScan.imageUrl ? (
                  <img 
                    src={selectedScan.imageUrl} 
                    alt="Skin Scan" 
                    className="w-full h-auto object-cover rounded-xl border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-full h-64 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                    <p>No image available</p>
                  </div>
                )}
                <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-500 font-medium">Scanned on</p>
                  <p className="font-semibold text-slate-900">{new Date(selectedScan.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detection Result</h4>
                  <p className="text-2xl font-bold text-slate-900">{selectedScan.result?.diseaseName || 'Unknown'}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedScan.result?.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    selectedScan.result?.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                    selectedScan.result?.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    Severity: {selectedScan.result?.severity || 'Unknown'}
                  </span>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {selectedScan.result?.description || 'No description available.'}
                  </p>
                </div>

                {selectedScan.result?.recommendations && selectedScan.result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {selectedScan.result.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span className="flex-1">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-consult Success Modal */}
      {showReconsultSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request Sent</h3>
            <p className="text-slate-600 mb-6">
              Re-consult requested. Please wait while the doctor accepts it.
            </p>
            <button 
              onClick={() => setShowReconsultSuccess(false)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <ContactUs userRole="patient" />
    </motion.div>
  );
}
