import { useEffect, useState, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, Eye, Trash2, MessageSquare, 
  Stethoscope, Search, 
  Bell, ChevronDown, Calendar, Sparkles, CheckCircle2, 
  BrainCircuit, Clock, Database, MoreVertical, LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { UserData, ScanData, ConsultationData, MessageData } from '../../types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [allScans, setAllScans] = useState<ScanData[]>([]);
  const [allConsultations, setAllConsultations] = useState<ConsultationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDoctorTab, setActiveDoctorTab] = useState<'unverified' | 'verified'>('unverified');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'thisMonth' | 'allTime'>('7days');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isAllScansModalOpen, setIsAllScansModalOpen] = useState(false);
  const [isAllPatientsModalOpen, setIsAllPatientsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<UserData | null>(null);
  const [patientEditForm, setPatientEditForm] = useState({ name: '', email: '', role: '', status: 'active' });
  const [patientModalTab, setPatientModalTab] = useState<'info' | 'scans' | 'consultations' | 'reports'>('info');
  const [allReports, setAllReports] = useState<any[]>([]);

  const [isAllDoctorsModalOpen, setIsAllDoctorsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<UserData | null>(null);
  const [doctorEditForm, setDoctorEditForm] = useState({ name: '', email: '', role: '', status: 'active', specialty: '', rating: 0 });
  const [doctorModalTab, setDoctorModalTab] = useState<'info' | 'consultations' | 'reports'>('info');

  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationData | null>(null);
  const [consultationMessages, setConsultationMessages] = useState<MessageData[]>([]);

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');

  const [contactQueries, setContactQueries] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAllQueriesModalOpen, setIsAllQueriesModalOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  const [activeQueryTab, setActiveQueryTab] = useState<'patient' | 'doctor'>('patient');

  useEffect(() => {
    // Real-time listener for users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      setLoading(false);
    });

    // Real-time listener for scans
    const qScans = query(collection(db, 'scans'), orderBy('createdAt', 'desc'));
    const unsubscribeScans = onSnapshot(qScans, (snapshot) => {
      const scansData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScanData));
      setAllScans(scansData);
    }, (error) => {
      console.error("Error fetching scans:", error);
      toast.error("Failed to fetch scans");
    });

    // Real-time listener for consultations
    const qConsults = query(collection(db, 'consultations'), orderBy('createdAt', 'desc'));
    const unsubscribeConsultations = onSnapshot(qConsults, (snapshot) => {
      const consultsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConsultationData));
      setAllConsultations(consultsData);
    }, (error) => {
      console.error("Error fetching consultations:", error);
      toast.error("Failed to fetch consultations");
    });

    // Real-time listener for reports
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reportsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllReports(reportsData);
    }, (error) => {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports");
    });

    // Real-time listener for contact queries
    const qQueries = query(collection(db, 'contact_queries'), orderBy('createdAt', 'desc'));
    const unsubscribeQueries = onSnapshot(qQueries, (snapshot) => {
      const queriesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setContactQueries(queriesData);
    }, (error) => {
      console.error("Error fetching contact queries:", error);
      toast.error("Failed to fetch contact queries");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeScans();
      unsubscribeConsultations();
      unsubscribeReports();
      unsubscribeQueries();
    };
  }, []);

  useEffect(() => {
    if (!selectedConsultation) {
      setConsultationMessages([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'consultations', selectedConsultation.id, 'messages'), (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      msgs.sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
      setConsultationMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });
    return () => unsubscribe();
  }, [selectedConsultation]);

  const updateDoctorStatus = async (userId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      toast.success(`Doctor status updated to ${status}`);
    } catch (error) {
      console.error("Error updating doctor status:", error);
      toast.error("Failed to update doctor status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        toast.success("User deleted successfully");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const handleEditPatient = (patient: UserData) => {
    setSelectedPatient(patient);
    setPatientModalTab('info');
    setPatientEditForm({
      name: patient.name || '',
      email: patient.email || '',
      role: patient.role || 'user',
      status: patient.status || 'active'
    });
  };

  const handleSavePatient = async () => {
    if (!selectedPatient) return;
    try {
      await updateDoc(doc(db, 'users', selectedPatient.id), {
        name: patientEditForm.name,
        email: patientEditForm.email,
        role: patientEditForm.role,
        status: patientEditForm.status
      });
      setSelectedPatient({...selectedPatient, ...patientEditForm} as UserData);
      toast.success('Patient details updated successfully');
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error("Failed to update patient details");
    }
  };

  const handleEditDoctor = (doctor: UserData) => {
    setSelectedDoctor(doctor);
    setDoctorModalTab('info');
    setDoctorEditForm({
      name: doctor.name || '',
      email: doctor.email || '',
      role: doctor.role || 'doctor',
      status: doctor.status || 'active',
      specialty: doctor.specialty || '',
      rating: doctor.rating || 0
    });
  };

  const handleSaveDoctor = async () => {
    if (!selectedDoctor) return;
    try {
      await updateDoc(doc(db, 'users', selectedDoctor.id), {
        name: doctorEditForm.name,
        email: doctorEditForm.email,
        role: doctorEditForm.role,
        status: doctorEditForm.status,
        specialty: doctorEditForm.specialty,
        rating: Number(doctorEditForm.rating)
      });
      setSelectedDoctor({...selectedDoctor, ...doctorEditForm} as UserData);
      toast.success('Doctor details updated successfully');
    } catch (error) {
      console.error("Error updating doctor:", error);
      toast.error("Failed to update doctor details");
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (confirm('Are you sure you want to delete this scan?')) {
      try {
        await deleteDoc(doc(db, 'scans', scanId));
        toast.success("Scan deleted successfully");
      } catch (error) {
        console.error("Error deleting scan:", error);
        toast.error("Failed to delete scan");
      }
    }
  };

  const handleDeleteConsultation = async (consultId: string) => {
    if (confirm('Are you sure you want to delete this consultation?')) {
      try {
        await deleteDoc(doc(db, 'consultations', consultId));
        toast.success("Consultation deleted successfully");
      } catch (error) {
        console.error("Error deleting consultation:", error);
        toast.error("Failed to delete consultation");
      }
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        toast.success("Report deleted successfully");
      } catch (error) {
        console.error("Error deleting report:", error);
        toast.error("Failed to delete report");
      }
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (confirm('Are you sure you want to delete this query?')) {
      try {
        await deleteDoc(doc(db, 'contact_queries', queryId));
        toast.success("Query deleted successfully");
      } catch (error) {
        console.error("Error deleting query:", error);
        toast.error("Failed to delete query");
      }
    }
  };

  const handleMarkQueryRead = async (queryId: string) => {
    try {
      await updateDoc(doc(db, 'contact_queries', queryId), { status: 'read' });
      toast.success("Query marked as read");
    } catch (error) {
      console.error("Error marking query as read:", error);
      toast.error("Failed to mark query as read");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const patients = users.filter(u => u.role === 'user');
  const allDoctors = users.filter(u => u.role === 'doctor');
  
  const filteredPatientsList = patients.filter(u => u.name?.toLowerCase().includes(patientSearchQuery.toLowerCase()));
  const filteredDoctorsList = allDoctors.filter(u => u.name?.toLowerCase().includes(doctorSearchQuery.toLowerCase()));

  const unverifiedDoctors = allDoctors.filter(d => d.status === 'pending' || d.status === 'rejected');
  const verifiedDoctors = allDoctors.filter(d => d.status === 'verified' || d.status === 'active');
  const displayedDoctors = activeDoctorTab === 'unverified' ? unverifiedDoctors : verifiedDoctors;

  const patientQueries = useMemo(() => contactQueries.filter(q => q.userRole === 'user'), [contactQueries]);
  const doctorQueries = useMemo(() => contactQueries.filter(q => q.userRole === 'doctor'), [contactQueries]);
  const displayedQueries = activeQueryTab === 'patient' ? patientQueries : doctorQueries;

  // Calculate start date based on selected range
  const startDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateRange === '7days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return d;
    } else if (dateRange === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return d;
    } else if (dateRange === 'thisMonth') {
      return new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      return new Date(0); // All time
    }
  }, [dateRange]);

  // Filter data based on date range
  const filteredScans = useMemo(() => allScans.filter(s => new Date(s.createdAt) >= startDate), [allScans, startDate]);
  const filteredConsultations = useMemo(() => allConsultations.filter(c => new Date(c.createdAt) >= startDate), [allConsultations, startDate]);
  const filteredPatients = useMemo(() => patients.filter(p => new Date(p.createdAt) >= startDate), [patients, startDate]);
  const filteredDoctors = useMemo(() => allDoctors.filter(d => new Date(d.createdAt) >= startDate), [allDoctors, startDate]);

  // Real-time chart data for AI Scan Activity
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    let daysToGenerate = 7;
    if (dateRange === '30days') daysToGenerate = 30;
    else if (dateRange === 'thisMonth') daysToGenerate = today.getDate();
    else if (dateRange === 'allTime') daysToGenerate = 30; // Limit to 30 days for chart readability
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const scansOnDay = allScans.filter(scan => {
        if (!scan.createdAt) return false;
        const scanDate = new Date(scan.createdAt);
        return scanDate.getDate() === d.getDate() && 
               scanDate.getMonth() === d.getMonth() && 
               scanDate.getFullYear() === d.getFullYear();
      }).length;

      data.push({ name: dateStr, scans: scansOnDay });
    }
    return data;
  }, [allScans, dateRange]);

  const dateRangeText = useMemo(() => {
    if (dateRange === 'allTime') return 'All Time';
    
    const today = new Date();
    const endStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let startStr = '';
    if (dateRange === '7days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (dateRange === '30days') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (dateRange === 'thisMonth') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    return `${startStr} - ${endStr}`;
  }, [dateRange]);

  const allFormattedScans = useMemo(() => {
    return filteredScans.map((scan, i) => {
      const patient = users.find(u => u.id === scan.userId);
      return {
        id: scan.id,
        patientName: patient?.name || `Patient #${102 - i}`,
        imageUrl: scan.imageUrl,
        result: scan.result?.diseaseName || 'Unknown',
        severity: scan.result?.severity || 'Low',
        date: new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    });
  }, [filteredScans, users]);

  const recentScans = allFormattedScans.slice(0, 4);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden fixed inset-0 z-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3 mr-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">DermaCare</span>
          </div>
          <div className="flex-1 max-w-xl relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search patients, scans, doctors..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Bell className="w-6 h-6" />
                {contactQueries.filter(q => q.status === 'unread').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {contactQueries.filter(q => q.status === 'unread').length}
                  </span>
                )}
              </button>
              
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Contact Queries</h3>
                    <button 
                      onClick={() => {
                        setIsAllQueriesModalOpen(true);
                        setIsNotificationOpen(false);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {contactQueries.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No queries found.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {contactQueries.map((query) => (
                          <div 
                            key={query.id} 
                            onClick={() => {
                              setSelectedQuery(query);
                              setIsAllQueriesModalOpen(true);
                              setIsNotificationOpen(false);
                              if (query.status === 'unread') handleMarkQueryRead(query.id);
                            }}
                            className={`p-4 cursor-pointer transition-colors ${query.status === 'unread' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <span className="font-semibold text-sm text-slate-900">{query.userEmail}</span>
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                  {query.userRole}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(query.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{query.message}</p>
                            <div className="flex justify-end gap-2 mt-3">
                              {query.status === 'unread' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkQueryRead(query.id);
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  Mark as Read
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuery(query.id);
                                }}
                                className="text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors border border-transparent hover:border-slate-200">
              <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                A
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-slate-900 leading-tight">admin123@gmail.com</p>
                <p className="text-xs text-slate-500 font-medium">Administrator</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Title & Date */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Admin Dashboard</h1>
                <p className="text-slate-500 font-medium">Overview of platform activity and management.</p>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {dateRangeText}
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </button>
                {isDateDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    <button onClick={() => { setDateRange('7days'); setIsDateDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 ${dateRange === '7days' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}>Last 7 Days</button>
                    <button onClick={() => { setDateRange('30days'); setIsDateDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 ${dateRange === '30days' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}>Last 30 Days</button>
                    <button onClick={() => { setDateRange('thisMonth'); setIsDateDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 ${dateRange === 'thisMonth' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}>This Month</button>
                    <button onClick={() => { setDateRange('allTime'); setIsDateDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 ${dateRange === 'allTime' ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}>All Time</button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="bg-blue-100 p-3.5 rounded-2xl text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{dateRange === 'allTime' ? 'Total Patients' : 'New Patients'}</p>
                  <p className="text-3xl font-black text-slate-900 mb-2">{dateRange === 'allTime' ? patients.length : filteredPatients.length}</p>
                  <p className="text-xs font-bold text-slate-500">+0% from last week</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="bg-purple-100 p-3.5 rounded-2xl text-purple-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{dateRange === 'allTime' ? 'Registered Doctors' : 'New Doctors'}</p>
                  <p className="text-3xl font-black text-slate-900 mb-2">{dateRange === 'allTime' ? allDoctors.length : filteredDoctors.length}</p>
                  <p className="text-xs font-bold text-slate-500">+0% from last week</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="bg-fuchsia-100 p-3.5 rounded-2xl text-fuchsia-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{dateRange === 'allTime' ? 'Total AI Scans' : 'New AI Scans'}</p>
                  <p className="text-3xl font-black text-slate-900 mb-2">{dateRange === 'allTime' ? allScans.length : filteredScans.length}</p>
                  <p className="text-xs font-bold text-green-500">+33% from last week</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                <div className="bg-indigo-100 p-3.5 rounded-2xl text-indigo-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{dateRange === 'allTime' ? 'Active Chats' : 'New Chats'}</p>
                  <p className="text-3xl font-black text-slate-900 mb-2">{dateRange === 'allTime' ? allConsultations.length : filteredConsultations.length}</p>
                  <p className="text-xs font-bold text-green-500">+50% from last week</p>
                </div>
              </div>
            </div>

            {/* Charts & Recent Scans */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">AI Scan Activity</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Scans performed over the {dateRange === 'allTime' ? 'last 30 days' : dateRange === '7days' ? 'last 7 days' : dateRange === '30days' ? 'last 30 days' : 'current month'}</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 500 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                        itemStyle={{ color: '#6366F1' }}
                      />
                      <Line type="monotone" dataKey="scans" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Scans */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-extrabold text-slate-900">Recent AI Scans</h3>
                  <button onClick={() => setIsAllScansModalOpen(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-100">
                        <th className="pb-3">Patient</th>
                        <th className="pb-3">Result</th>
                        <th className="pb-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentScans.map((scan, i) => (
                        <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              {scan.imageUrl ? (
                                <img 
                                  src={scan.imageUrl} 
                                  alt="Scan" 
                                  className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-200 hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage(scan.imageUrl)}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                  <Sparkles className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <span className="font-bold text-slate-900">{scan.patientName}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                              scan.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                              scan.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                              scan.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              scan.severity === 'Low' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {scan.result}
                            </span>
                          </td>
                          <td className="py-4 text-right text-slate-500 font-medium">{scan.date}</td>
                        </tr>
                      ))}
                      {recentScans.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500 font-medium">No recent scans</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Doctor Verifications & Patient Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Doctor Verifications */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-extrabold text-slate-900">Doctor Verifications</h3>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setActiveDoctorTab('unverified')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeDoctorTab === 'unverified' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pending ({unverifiedDoctors.length})</button>
                    <button onClick={() => setActiveDoctorTab('verified')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeDoctorTab === 'verified' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Verified ({verifiedDoctors.length})</button>
                  </div>
                </div>
                <div className="space-y-4">
                  {displayedDoctors.length === 0 ? (
                    <p className="text-center py-8 text-slate-500 font-medium">No {activeDoctorTab} doctors.</p>
                  ) : (
                    displayedDoctors.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl shadow-sm">
                            {doc.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{doc.name}</p>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{doc.specialty}</p>
                            <p className="text-xs text-slate-500">{doc.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {doc.status === 'pending' ? (
                            <>
                              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">Pending</span>
                              <button onClick={() => updateDoctorStatus(doc.id, 'verified')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Verify"><Eye className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg">Verified</span>
                          )}
                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                          <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Patient Management */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-extrabold text-slate-900">Patient Management</h3>
                  <button onClick={() => setIsAllPatientsModalOpen(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 font-bold border-b border-slate-100">
                      <th className="pb-3">Patient</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {patients.slice(0, 4).map(patient => (
                      <tr key={patient.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-bold text-slate-900">{patient.name}</td>
                        <td className="py-4 text-slate-500 font-medium">{patient.email}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${
                            patient.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                            patient.status === 'banned' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {patient.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-4 text-slate-500 font-medium">{new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditPatient(patient)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(patient.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {patients.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">No patients found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doctor Management */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-extrabold text-slate-900">Doctor Management</h3>
                <button onClick={() => setIsAllDoctorsModalOpen(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 font-bold border-b border-slate-100">
                    <th className="pb-3">Doctor</th>
                    <th className="pb-3">UID</th>
                    <th className="pb-3">Specialty</th>
                    <th className="pb-3">Rating</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Online</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allDoctors.slice(0, 4).map(doctor => (
                    <tr key={doctor.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-900">{doctor.name}</td>
                      <td className="py-4 text-slate-500 font-medium text-xs">{doctor.id}</td>
                      <td className="py-4 text-slate-500 font-medium">{doctor.specialty || 'N/A'}</td>
                      <td className="py-4 text-slate-500 font-medium">{doctor.rating ? `${doctor.rating} / 5` : 'N/A'}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${
                          doctor.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                          doctor.status === 'banned' ? 'bg-red-100 text-red-700' :
                          doctor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {doctor.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${doctor.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                          <span className="text-xs font-bold text-slate-600">{doctor.isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditDoctor(doctor)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteUser(doctor.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allDoctors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">No doctors found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Contact Queries Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Patient Queries Table */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-extrabold text-slate-900">Patient Queries</h3>
                  <button onClick={() => { setActiveQueryTab('patient'); setIsAllQueriesModalOpen(true); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-100">
                        <th className="pb-3">Patient</th>
                        <th className="pb-3">Message</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {patientQueries.slice(0, 4).map(query => (
                        <tr key={query.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-bold text-slate-900 truncate max-w-[120px]">{query.userEmail}</td>
                          <td className="py-4 text-slate-500 font-medium line-clamp-1 max-w-[200px]">{query.message}</td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setSelectedQuery(query); setIsAllQueriesModalOpen(true); setActiveQueryTab('patient'); if (query.status === 'unread') handleMarkQueryRead(query.id); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteQuery(query.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {patientQueries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500 font-medium">No patient queries</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Doctor Queries Table */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-extrabold text-slate-900">Doctor Queries</h3>
                  <button onClick={() => { setActiveQueryTab('doctor'); setIsAllQueriesModalOpen(true); }} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-500 font-bold border-b border-slate-100">
                        <th className="pb-3">Doctor</th>
                        <th className="pb-3">Message</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {doctorQueries.slice(0, 4).map(query => (
                        <tr key={query.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-bold text-slate-900 truncate max-w-[120px]">{query.userEmail}</td>
                          <td className="py-4 text-slate-500 font-medium line-clamp-1 max-w-[200px]">{query.message}</td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setSelectedQuery(query); setIsAllQueriesModalOpen(true); setActiveQueryTab('doctor'); if (query.status === 'unread') handleMarkQueryRead(query.id); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteQuery(query.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {doctorQueries.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500 font-medium">No doctor queries</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* All Scans Modal */}
      {isAllScansModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">All AI Scans</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Showing {allFormattedScans.length} scans for {dateRangeText}</p>
              </div>
              <button 
                onClick={() => setIsAllScansModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold">
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Result</th>
                      <th className="px-6 py-4">Severity</th>
                      <th className="px-6 py-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allFormattedScans.map((scan, i) => (
                      <tr key={i} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {scan.imageUrl ? (
                              <img 
                                src={scan.imageUrl} 
                                alt="Scan" 
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-200 hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(scan.imageUrl)}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                <Sparkles className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <span className="font-bold text-slate-900">{scan.patientName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{scan.result}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            scan.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                            scan.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                            scan.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            scan.severity === 'Low' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {scan.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium">{scan.date}</td>
                      </tr>
                    ))}
                    {allFormattedScans.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center">
                            <Sparkles className="w-8 h-8 text-slate-300 mb-3" />
                            <p>No scans found for this period</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 sm:p-6" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <img src={selectedImage} alt="Scan Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain bg-black/50" />
          </div>
        </div>
      )}

      {/* All Patients Modal */}
      {isAllPatientsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">All Patients</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Showing {filteredPatientsList.length} patients</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patients by name..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
                  />
                </div>
                <button 
                  onClick={() => setIsAllPatientsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold">
                      <th className="px-6 py-4">Patient</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatientsList.map(patient => (
                      <tr key={patient.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{patient.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{patient.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${
                            patient.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                            patient.status === 'banned' ? 'bg-red-100 text-red-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {patient.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setIsAllPatientsModalOpen(false); handleEditPatient(patient); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(patient.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPatientsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center">
                            <Users className="w-8 h-8 text-slate-300 mb-3" />
                            <p>No patients found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Doctors Modal */}
      {isAllDoctorsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">All Doctors</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Showing {filteredDoctorsList.length} doctors</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search doctors by name..."
                    value={doctorSearchQuery}
                    onChange={(e) => setDoctorSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64"
                  />
                </div>
                <button 
                  onClick={() => setIsAllDoctorsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold">
                      <th className="px-6 py-4">Doctor</th>
                      <th className="px-6 py-4">UID</th>
                      <th className="px-6 py-4">Specialty</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Online</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDoctorsList.map(doctor => (
                      <tr key={doctor.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{doctor.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium text-xs">{doctor.id}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{doctor.specialty || 'N/A'}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{doctor.rating ? `${doctor.rating} / 5` : 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold capitalize ${
                            doctor.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                            doctor.status === 'banned' ? 'bg-red-100 text-red-700' :
                            doctor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {doctor.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${doctor.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <span className="text-xs font-bold text-slate-600">{doctor.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { setIsAllDoctorsModalOpen(false); handleEditDoctor(doctor); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(doctor.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDoctorsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                          <div className="flex flex-col items-center justify-center">
                            <Stethoscope className="w-8 h-8 text-slate-300 mb-3" />
                            <p>No doctors found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedDoctor.name}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">UID: {selectedDoctor.id}</p>
              </div>
              <button 
                onClick={() => setSelectedDoctor(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-2">
                <button onClick={() => setDoctorModalTab('info')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${doctorModalTab === 'info' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Profile Info</button>
                <button onClick={() => setDoctorModalTab('consultations')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${doctorModalTab === 'consultations' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Consultations</button>
                <button onClick={() => setDoctorModalTab('reports')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${doctorModalTab === 'reports' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Reports</button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {doctorModalTab === 'info' && (
                  <div className="max-w-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Account Created</p>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Current Status</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 capitalize">{selectedDoctor.status || 'Active'}</p>
                          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-white rounded-md border border-slate-200">
                            <div className={`w-1.5 h-1.5 rounded-full ${selectedDoctor.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{selectedDoctor.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                      <input type="text" value={doctorEditForm.name} onChange={(e) => setDoctorEditForm({...doctorEditForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                      <input type="email" value={doctorEditForm.email} onChange={(e) => setDoctorEditForm({...doctorEditForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Specialty</label>
                        <input type="text" value={doctorEditForm.specialty} onChange={(e) => setDoctorEditForm({...doctorEditForm, specialty: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Rating (0-5)</label>
                        <input type="number" min="0" max="5" step="0.1" value={doctorEditForm.rating} onChange={(e) => setDoctorEditForm({...doctorEditForm, rating: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                        <select value={doctorEditForm.role} onChange={(e) => setDoctorEditForm({...doctorEditForm, role: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white">
                          <option value="user">Patient (User)</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <select value={doctorEditForm.status} onChange={(e) => setDoctorEditForm({...doctorEditForm, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white">
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={handleSaveDoctor} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">Save Changes</button>
                    </div>
                  </div>
                )}

                {doctorModalTab === 'consultations' && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Consultation History</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Patient</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allConsultations.filter(c => c.doctorId === selectedDoctor.id).map(consult => {
                            const patient = users.find(u => u.id === consult.patientId);
                            return (
                              <tr key={consult.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{new Date(consult.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{patient?.name || 'Unknown Patient'}</td>
                                <td className="px-4 py-3 capitalize">{consult.status}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setSelectedConsultation(consult)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteConsultation(consult.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {allConsultations.filter(c => c.doctorId === selectedDoctor.id).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No consultations found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {doctorModalTab === 'reports' && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Reports Filed Against Doctor</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reported By</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allReports.filter(r => r.reportedUserId === selectedDoctor.id).map(report => {
                            const reporter = users.find(u => u.id === report.reporterId);
                            return (
                              <tr key={report.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{new Date(report.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{reporter?.name || 'Unknown'}</td>
                                <td className="px-4 py-3">{report.reason}</td>
                                <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleDeleteReport(report.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                              </tr>
                            );
                          })}
                          {allReports.filter(r => r.reportedUserId === selectedDoctor.id).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No reports filed.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedPatient.name}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">UID: {selectedPatient.id}</p>
              </div>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-2">
                <button onClick={() => setPatientModalTab('info')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${patientModalTab === 'info' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Profile Info</button>
                <button onClick={() => setPatientModalTab('scans')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${patientModalTab === 'scans' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>AI Scans</button>
                <button onClick={() => setPatientModalTab('consultations')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${patientModalTab === 'consultations' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Consultations</button>
                <button onClick={() => setPatientModalTab('reports')} className={`text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${patientModalTab === 'reports' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>Reports</button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {patientModalTab === 'info' && (
                  <div className="max-w-xl space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Account Created</p>
                        <p className="text-sm font-bold text-slate-900">
                          {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Current Status</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">{selectedPatient.status || 'Active'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                      <input type="text" value={patientEditForm.name} onChange={(e) => setPatientEditForm({...patientEditForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                      <input type="email" value={patientEditForm.email} onChange={(e) => setPatientEditForm({...patientEditForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
                        <select value={patientEditForm.role} onChange={(e) => setPatientEditForm({...patientEditForm, role: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white">
                          <option value="user">Patient (User)</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                        <select value={patientEditForm.status} onChange={(e) => setPatientEditForm({...patientEditForm, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white">
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button onClick={handleSavePatient} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">Save Changes</button>
                    </div>
                  </div>
                )}

                {patientModalTab === 'scans' && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">AI Scan History</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Image</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allScans.filter(s => s.userId === selectedPatient.id).map(scan => (
                            <tr key={scan.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-700">{new Date(scan.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                {scan.imageUrl && <img src={scan.imageUrl} alt="Scan" className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80" onClick={() => setSelectedImage(scan.imageUrl)} />}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">{scan.result?.diseaseName || 'Unknown'}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDeleteScan(scan.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                          {allScans.filter(s => s.userId === selectedPatient.id).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No scans found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {patientModalTab === 'consultations' && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Consultation History</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Doctor</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allConsultations.filter(c => c.patientId === selectedPatient.id).map(consult => {
                            const doc = users.find(u => u.id === consult.doctorId);
                            return (
                              <tr key={consult.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{new Date(consult.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{doc?.name || 'Unknown Doctor'}</td>
                                <td className="px-4 py-3 capitalize">{consult.status}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setSelectedConsultation(consult)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteConsultation(consult.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {allConsultations.filter(c => c.patientId === selectedPatient.id).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No consultations found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {patientModalTab === 'reports' && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Reports Filed Against User</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-slate-600 font-bold">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reported By</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allReports.filter(r => r.reportedUserId === selectedPatient.id).map(report => {
                            const reporter = users.find(u => u.id === report.reporterId);
                            return (
                              <tr key={report.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">{new Date(report.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-slate-900">{reporter?.name || 'Unknown'}</td>
                                <td className="px-4 py-3">{report.reason}</td>
                                <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleDeleteReport(report.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                              </tr>
                            );
                          })}
                          {allReports.filter(r => r.reportedUserId === selectedPatient.id).length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No reports filed.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consultation History Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[130] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Consultation History</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">ID: {selectedConsultation.id}</p>
              </div>
              <button 
                onClick={() => setSelectedConsultation(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="space-y-4">
                {consultationMessages.map((msg, idx) => {
                  const isDoctor = msg.senderId === selectedConsultation.doctorId;
                  return (
                    <div key={msg.id || idx} className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-4 ${isDoctor ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                        <p className="text-sm">{msg.text}</p>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Attachment" className="mt-3 rounded-xl max-w-full h-auto border border-black/10" />
                        )}
                        <p className={`text-[10px] mt-2 font-medium ${isDoctor ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {consultationMessages.length === 0 && (
                  <div className="text-center py-12 text-slate-500 font-medium">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p>No messages in this consultation yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Contact Queries Modal */}
      {isAllQueriesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">User Contact Queries</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Manage and respond to user messages and feedback.</p>
              </div>
              <button 
                onClick={() => {
                  setIsAllQueriesModalOpen(false);
                  setSelectedQuery(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden bg-slate-50">
              {/* Queries List */}
              <div className="w-1/3 border-r border-slate-200 overflow-y-auto bg-white flex flex-col">
                <div className="flex bg-slate-100 p-1 m-4 rounded-lg">
                  <button 
                    onClick={() => {
                      setActiveQueryTab('patient');
                      setSelectedQuery(null);
                    }} 
                    className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeQueryTab === 'patient' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Patients ({patientQueries.length})
                  </button>
                  <button 
                    onClick={() => {
                      setActiveQueryTab('doctor');
                      setSelectedQuery(null);
                    }} 
                    className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeQueryTab === 'doctor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Doctors ({doctorQueries.length})
                  </button>
                </div>

                {displayedQueries.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium">
                    No {activeQueryTab} queries found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 overflow-y-auto">
                    {displayedQueries.map((query) => (
                      <div 
                        key={query.id} 
                        onClick={() => {
                          setSelectedQuery(query);
                          if (query.status === 'unread') handleMarkQueryRead(query.id);
                        }}
                        className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${selectedQuery?.id === query.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''} ${query.status === 'unread' ? 'font-bold' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm text-slate-900 truncate max-w-[150px]">{query.userEmail}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(query.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${query.userRole === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {query.userRole}
                          </span>
                          {query.status === 'unread' && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{query.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Query Detail */}
              <div className="flex-1 overflow-y-auto p-8 flex flex-col">
                {selectedQuery ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm h-full flex flex-col">
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">{selectedQuery.userEmail}</h3>
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${selectedQuery.userRole === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {selectedQuery.userRole}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Submitted on {new Date(selectedQuery.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            handleDeleteQuery(selectedQuery.id);
                            setSelectedQuery(null);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                          title="Delete Query"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Message Content</h4>
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[200px]">
                        {selectedQuery.message}
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                      <button 
                        className="btn-3d btn-3d-blue px-6 py-2.5 text-sm font-bold"
                        onClick={() => window.location.href = `mailto:${selectedQuery.userEmail}`}
                      >
                        Reply via Email
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                      <MessageSquare className="w-12 h-12 text-slate-300" />
                    </div>
                    <p className="font-bold text-lg">Select a query to read details</p>
                    <p className="text-sm">Choose a message from the list on the left to view the full content.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
