import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { CheckCircle, XCircle, Clock, Flag, X, MessageSquare, Send, Image as ImageIcon, PhoneOff, Star, LayoutDashboard, Activity, History, User } from 'lucide-react';
import ContactUs from '../../components/ContactUs';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UserData, ConsultationData, MessageData } from '../../types';

export default function DoctorDashboard() {
  const [consultations, setConsultations] = useState<ConsultationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);
  const [doctorRating, setDoctorRating] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [doctorData, setDoctorData] = useState<UserData | null>(null);

  // Profile Edit State
  const [profileModal, setProfileModal] = useState({
    isOpen: false,
    name: '',
    specialty: '',
    experience: '',
    bio: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Chat Modal State
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    consultationId: string;
    patientName: string;
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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Listen to doctor data changes
    const doctorRef = doc(db, 'users', user.uid);
    const unsubscribeDoctor = onSnapshot(doctorRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        setDoctorData(data);
        setDoctorStatus(data.status);
        setIsOnline(data.isOnline || false);
        setDoctorRating(data.rating || null);
        
        // Pre-fill profile modal state
        setProfileModal(prev => ({
          ...prev,
          name: data.name || '',
          specialty: data.specialty || '',
          experience: data.experience || '',
          bio: data.bio || ''
        }));
      }
    });

    // 2. Listen to consultations changes
    const q = query(
      collection(db, 'consultations'),
      where('doctorId', '==', user.uid)
    );

    const unsubscribeConsultations = onSnapshot(q, async (snapshot) => {
      try {
        const requests = await Promise.all(snapshot.docs.map(async (d) => {
          const data = d.data() as ConsultationData;
          
          // Fetch patient details
          let patientName = 'Unknown Patient';
          try {
            const patientDoc = await getDoc(doc(db, 'users', data.patientId));
            if (patientDoc.exists()) patientName = patientDoc.data().name;
          } catch (e) {}

          // Fetch scan details
          let scanData = null;
          try {
            if (data.scanId) {
              const scanDoc = await getDoc(doc(db, 'scans', data.scanId));
              if (scanDoc.exists()) scanData = scanDoc.data();
            }
          } catch (e) {}

          return {
            id: d.id,
            ...data,
            patientName,
            scanData
          } as ConsultationData;
        }));
        
        // Sort by date descending
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setConsultations(requests);
      } catch (error) {
        console.error("Error in consultations snapshot:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeDoctor();
      unsubscribeConsultations();
    };
  }, []);

  useEffect(() => {
    if (!chatModal?.isOpen) return;
    
    // 1. Listen to messages
    const q = query(
      collection(db, 'messages'),
      where('consultationId', '==', chatModal.consultationId)
    );
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      msgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(msgs);
    });

    // 2. Listen to consultation status changes
    const consultationRef = doc(db, 'consultations', chatModal.consultationId);
    const unsubscribeConsultation = onSnapshot(consultationRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChatModal(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeConsultation();
    };
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
        text: 'Doctor has ended the chat and disconnected.',
        createdAt: new Date().toISOString()
      });
      setChatModal(prev => prev ? { ...prev, status: 'completed' } : null);
      toast.success('Consultation marked as completed.');
    } catch (error) {
      console.error("Error ending chat:", error);
      toast.error('Failed to end chat.');
    }
  };

  const toggleOnlineStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const newStatus = !isOnline;
      await updateDoc(doc(db, 'users', user.uid), { isOnline: newStatus });
      setIsOnline(newStatus);
      toast.success(`You are now ${newStatus ? 'online' : 'offline'}.`);
    } catch (error) {
      console.error("Error updating online status:", error);
      toast.error('Failed to update status.');
    }
  };

  const updateStatus = async (id: string, status: 'accepted' | 'rejected' | 'completed') => {
    try {
      await updateDoc(doc(db, 'consultations', id), { status });
      toast.success(`Consultation ${status}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error('Failed to update status.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !reportModal) return;
    
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: auth.currentUser.uid,
        reportedUserId: reportModal.targetId,
        consultationId: reportModal.consultationId,
        reporterRole: 'doctor',
        reportedRole: 'patient',
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
    if (!auth.currentUser) return;

    setIsUpdatingProfile(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updatedData = {
        name: profileModal.name,
        specialty: profileModal.specialty,
        experience: profileModal.experience,
        bio: profileModal.bio
      };
      await updateDoc(userRef, updatedData);
      setDoctorData((prev) => prev ? { ...prev, ...updatedData } : null);
      setProfileModal(prev => ({ ...prev, isOpen: false }));
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  if (doctorStatus === 'pending') {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-yellow-200 text-center">
        <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Approval</h2>
        <p className="text-slate-600">
          Your doctor account is currently under review by our administration team. 
          You will gain access to the dashboard once your credentials have been verified.
        </p>
      </div>
    );
  }

  if (doctorStatus === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Rejected</h2>
        <p className="text-slate-600">
          Unfortunately, your application to join as a doctor has been rejected. 
          Please contact support for more information.
        </p>
      </div>
    );
  }

  const activeConsultations = consultations.filter(c => c.status === 'pending' || c.status === 'accepted');
  const pastConsultations = consultations.filter(c => c.status === 'completed' || c.status === 'rejected');
  const displayedConsultations = activeTab === 'active' ? activeConsultations : pastConsultations;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
            Doctor <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-slate-500 font-medium">Manage your consultations and patient interactions.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Status:</span>
            <button 
              onClick={toggleOnlineStatus}
              className={`flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isOnline 
                  ? 'bg-green-50 text-green-700 border border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
          {doctorRating !== null && (
            <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-black text-slate-900">{doctorRating}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <div className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full group border-t-4 border-t-blue-500">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.4)]">
              <MessageSquare className="h-10 w-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900">{consultations.filter(c => c.status === 'pending').length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pending Requests</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <div className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full group border-t-4 border-t-green-500">
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(34,197,94,0.4)]">
              <Activity className="h-10 w-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900">{consultations.filter(c => c.status === 'accepted').length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Chats</span>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <div className="glass-3d p-8 flex flex-col items-center justify-center text-center gap-4 h-full group border-t-4 border-t-purple-500">
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-5 rounded-2xl text-white group-hover:scale-110 transition-transform duration-500 shadow-[0_10px_20px_-5px_rgba(168,85,247,0.4)]">
              <History className="h-10 w-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900">{consultations.filter(c => c.status === 'completed').length}</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Completed</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Patient Consultations
              </h2>
              <div className="flex bg-slate-100/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200/50">
                <button 
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Active ({activeConsultations.length})
                </button>
                <button 
                  onClick={() => setActiveTab('past')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'past' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Past ({pastConsultations.length})
                </button>
              </div>
            </div>
            <div className="glass-3d overflow-hidden border-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>Loading consultations...</span>
                </div>
              ) : displayedConsultations.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center gap-6">
                  <div className="bg-slate-100 p-6 rounded-3xl text-slate-300 shadow-inner">
                    <MessageSquare className="w-12 h-12" />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-slate-900 font-black text-lg mb-2">No {activeTab} consultations</p>
                    <p className="text-slate-500 text-sm font-medium">When patients request a consultation, they will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100/50">
                  {displayedConsultations.map((req) => (
                    <div key={req.id} className="p-8 flex flex-col md:flex-row gap-8 hover:bg-white/40 transition-colors group">
                      {req.scanData?.imageUrl && (
                        <div className="relative shrink-0">
                          <img 
                            src={req.scanData.imageUrl} 
                            alt="Skin scan" 
                            className="w-40 h-40 object-cover rounded-2xl border border-white shadow-md group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 rounded-2xl shadow-inner pointer-events-none" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{req.patientName}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border flex items-center gap-2 ${
                            req.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            req.status === 'accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            req.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {req.status === 'pending' && <Clock className="w-3 h-3 animate-pulse" />}
                            {req.status === 'accepted' && <Activity className="w-3 h-3" />}
                            {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {req.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            {req.status}
                          </span>
                        </div>
                        
                        {req.scanData && (
                          <div className="bg-white/50 p-5 rounded-2xl mb-6 border border-white/50 shadow-inner">
                            <p className="font-black text-slate-900 mb-1">AI Detection: <span className="text-blue-600">{req.scanData.result.diseaseName}</span></p>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed line-clamp-2">{req.scanData.result.description}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4">
                          {req.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateStatus(req.id, 'accepted')}
                                className="btn-3d btn-3d-blue px-8 py-3 text-xs"
                              >
                                Accept Request
                              </button>
                              <button 
                                onClick={() => updateStatus(req.id, 'rejected')}
                                className="bg-red-50 text-red-600 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {req.status === 'accepted' && (
                            <>
                              <button 
                                onClick={() => setChatModal({ isOpen: true, consultationId: req.id, patientName: req.patientName, status: req.status })}
                                className="btn-3d btn-3d-blue px-8 py-3 text-xs flex items-center gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Chat with Patient
                              </button>
                              <button 
                                onClick={() => updateStatus(req.id, 'completed')}
                                className="btn-3d btn-3d-white px-8 py-3 text-xs text-green-600"
                              >
                                Mark Completed
                              </button>
                              <button 
                                onClick={() => setReportModal({ isOpen: true, targetId: req.patientId, consultationId: req.id })}
                                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ml-auto"
                                title="Report Patient"
                              >
                                <Flag className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {(req.status === 'completed' || req.status === 'rejected') && (
                            <button 
                              onClick={() => setChatModal({ isOpen: true, consultationId: req.id, patientName: req.patientName, status: req.status })}
                              className="btn-3d btn-3d-white px-8 py-3 text-xs flex items-center gap-2"
                            >
                              <History className="w-4 h-4" />
                              View History
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="glass-3d p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-green-500/10 transition-colors" />
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Doctor Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-black text-slate-900 text-lg">{doctorRating || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Consults</span>
                <span className="font-black text-slate-900 text-lg">{consultations.length}</span>
              </div>
            </div>
          </section>

          <section className="glass-3d p-8">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => setProfileModal(prev => ({ ...prev, isOpen: true }))}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Edit Profile</span>
                </div>
                <X className="w-4 h-4 text-slate-300 rotate-45" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {chatModal?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-3d rounded-3xl w-full max-w-2xl h-[650px] flex flex-col shadow-2xl relative overflow-hidden border-0"
            >
              <div className="p-6 border-b border-white/20 flex justify-between items-center bg-white/40 backdrop-blur-md">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    Chat with {chatModal.patientName}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {chatModal.status === 'completed' ? 'Read-only History' : 'Active Consultation'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {chatModal.status === 'accepted' && (
                    <button 
                      onClick={handleEndChat}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      End Chat
                    </button>
                  )}
                  <button 
                    onClick={() => setChatModal(null)}
                    className="text-slate-400 hover:text-slate-600 p-2 bg-slate-100/50 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/20 backdrop-blur-sm">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 italic gap-4">
                    <div className="bg-slate-100 p-6 rounded-full">
                      <MessageSquare className="w-10 h-10 opacity-20" />
                    </div>
                    <span className="font-bold">No messages yet. Start the conversation!</span>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSystem = msg.senderId === 'system';
                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-6">
                          <span className="bg-slate-200/50 backdrop-blur-md text-slate-600 text-[10px] px-6 py-2 rounded-full font-black uppercase tracking-widest border border-white/50 shadow-sm">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }
  
                    const isMe = msg.senderId === auth.currentUser?.uid;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={msg.id} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                          isMe 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-br-none shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)]' 
                            : 'bg-white/80 backdrop-blur-md border border-white text-slate-800 rounded-bl-none'
                        }`}>
                          {msg.imageUrl && (
                            <div className="relative group mb-2 mt-1">
                              <img src={msg.imageUrl} alt="Shared" className="max-w-full rounded-xl border-2 border-white shadow-sm" />
                              <div className="absolute inset-0 rounded-xl shadow-inner pointer-events-none" />
                            </div>
                          )}
                          {msg.text && msg.text !== 'Sent an image' && <p className="text-sm font-medium leading-relaxed">{msg.text}</p>}
                          <p className={`text-[9px] font-black uppercase tracking-widest mt-2 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
  
              {chatModal.status === 'accepted' ? (
                <form onSubmit={handleSendMessage} className="p-6 border-t border-white/20 bg-white/40 backdrop-blur-md flex gap-4 items-center">
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
                    className="text-slate-400 hover:text-blue-600 p-3 bg-white/50 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    title="Send Image"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl px-6 py-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="btn-3d btn-3d-blue p-3.5 rounded-2xl disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center w-14 h-14 shrink-0"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              ) : (
                <div className="p-6 border-t border-white/20 bg-slate-100/50 backdrop-blur-md text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/50 px-6 py-2 rounded-full border border-white shadow-sm">
                    Consultation {chatModal.status} • Read-only Mode
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  
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
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Specialty</label>
                  <input 
                    type="text" 
                    required
                    value={profileModal.specialty}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, specialty: e.target.value }))}
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Work Experience (Years)</label>
                  <input 
                    type="text" 
                    required
                    value={profileModal.experience}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, experience: e.target.value }))}
                    placeholder="e.g. 10+ years"
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Professional Bio</label>
                  <textarea 
                    value={profileModal.bio}
                    onChange={(e) => setProfileModal(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    placeholder="Briefly describe your professional background..."
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
  
      {/* Report Modal */}
      <AnimatePresence>
        {reportModal?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-3d rounded-3xl w-full max-w-md p-8 shadow-2xl relative border-0"
            >
              <button 
                onClick={() => setReportModal(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-100/50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-red-100 p-3 rounded-2xl">
                  <Flag className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Report Patient</h3>
              </div>
              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Reason for Report</label>
                  <select 
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all shadow-inner"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Inappropriate Behavior">Inappropriate Behavior</option>
                    <option value="No Show">No Show</option>
                    <option value="Spam or Scam">Spam or Scam</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Description</label>
                  <textarea 
                    required
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={4}
                    placeholder="Please provide details about the issue..."
                    className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none resize-none transition-all shadow-inner"
                  ></textarea>
                </div>
                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setReportModal(null)} 
                    className="flex-1 px-6 py-4 text-slate-600 hover:bg-slate-100/50 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-transparent hover:border-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex-1 btn-3d btn-3d-blue !from-red-400 !to-red-600 !shadow-[0_4px_0_0_#b91c1c] px-6 py-4 text-xs disabled:opacity-50"
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ContactUs userRole="doctor" />
    </motion.div>
  );
}
