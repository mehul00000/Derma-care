import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-16 relative overflow-hidden bg-skin-overlay">
      {/* Decorative background elements */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute top-10 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px]"
      ></motion.div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", delay: 1 }}
        className="absolute top-10 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px]"
      ></motion.div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 2 }}
        className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[100px]"
      ></motion.div>

      {/* Floating 3D Elements */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="hidden md:block absolute top-1/4 left-10 glass-3d p-4 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-xl shadow-inner text-white">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accuracy</p>
            <p className="text-lg font-extrabold text-slate-800">99.8%</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
        className="hidden md:block absolute top-1/3 right-10 glass-3d p-4 z-20"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-inner text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Privacy</p>
            <p className="text-lg font-extrabold text-slate-800">HIPAA Compliant</p>
          </div>
        </div>
      </motion.div>

      <div className="text-center max-w-4xl relative z-10 mt-10 px-4">
        <motion.h1 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[1.1]"
        >
          <span className="text-slate-900 drop-shadow-sm">AI-Powered</span> <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 drop-shadow-sm">Skin Health Analysis</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
        >
          Instant, AI-driven insights for your skin. Connect with specialized dermatologists for professional medical guidance and personalized care.
        </motion.p>
        
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <Link to="/signup" className="btn-3d btn-3d-blue px-10 py-5 text-xl w-full sm:w-auto flex items-center justify-center gap-2">
            Get Started Free <ChevronRight className="w-6 h-6" />
          </Link>
          <Link to="/login" className="btn-3d btn-3d-white px-10 py-5 text-xl w-full sm:w-auto">
            Login to Account
          </Link>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="grid md:grid-cols-3 gap-8 mt-32 w-full max-w-6xl mx-auto px-4 relative z-10"
      >
        <div className="glass-3d p-8 flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 bg-gradient-to-br from-blue-400 to-blue-600 p-5 rounded-2xl text-white mb-6 shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
            <Activity className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-extrabold mb-3 text-slate-800 relative z-10">Instant AI Analysis</h3>
          <p className="text-slate-600 leading-relaxed font-medium relative z-10">Get immediate insights into potential skin conditions using advanced AI models with high accuracy.</p>
        </div>
        <div className="glass-3d p-8 flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 rounded-2xl text-white mb-6 shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-extrabold mb-3 text-slate-800 relative z-10">Secure & Private</h3>
          <p className="text-slate-600 leading-relaxed font-medium relative z-10">Your medical data and images are encrypted and stored securely with strict privacy controls and HIPAA compliance.</p>
        </div>
        <div className="glass-3d p-8 flex flex-col items-center text-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 bg-gradient-to-br from-purple-400 to-purple-600 p-5 rounded-2xl text-white mb-6 shadow-[0_10px_20px_-10px_rgba(168,85,247,0.5)] group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
            <Clock className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-extrabold mb-3 text-slate-800 relative z-10">24/7 Availability</h3>
          <p className="text-slate-600 leading-relaxed font-medium relative z-10">Access your scan history and connect with available dermatologists anytime, anywhere around the globe.</p>
        </div>
      </motion.div>
    </div>
  );
}
