export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'doctor' | 'admin';
  status: 'pending' | 'verified' | 'active' | 'rejected' | 'suspended' | 'banned';
  createdAt: string;
  bio?: string;
  phone?: string;
  specialty?: string;
  experience?: string;
  rating?: number;
  isOnline?: boolean;
}

export interface ScanResult {
  diseaseName: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendations: string[];
}

export interface ScanData {
  id: string;
  userId: string;
  imageUrl: string;
  result: ScanResult;
  createdAt: string;
}

export interface ConsultationData {
  id: string;
  patientId: string;
  doctorId: string;
  scanId?: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  createdAt: string;
  patientName?: string;
  doctorName?: string;
  scanData?: ScanData;
}

export interface MessageData {
  id: string;
  consultationId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ReportData {
  id: string;
  reporterId: string;
  reportedUserId: string;
  consultationId: string;
  reporterRole: 'patient' | 'doctor';
  reportedRole: 'patient' | 'doctor';
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface ContactQuery {
  id: string;
  userEmail: string;
  userRole: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: string;
}
