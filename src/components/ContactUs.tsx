import { useState } from 'react';
import { MessageCircle, X, Send, CheckCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function ContactUs({ userRole }: { userRole: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contact_queries'), {
        userId: auth.currentUser.uid,
        userRole,
        userEmail: auth.currentUser.email,
        message: message.trim(),
        status: 'unread',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting query:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] border border-white/50 w-85 overflow-hidden flex flex-col mb-4"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between text-white shadow-lg">
              <h3 className="font-extrabold flex items-center gap-2 tracking-tight">
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-white/20 hover:bg-white/30 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <p className="text-slate-900 font-extrabold text-lg tracking-tight">Message Sent!</p>
                  <p className="text-sm text-slate-500 mt-2">Our team will review your query soon.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    Need help? Send us a message and we'll get back to you as soon as possible.
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    className="w-full p-4 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none h-36 transition-all bg-slate-50/50"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="btn-3d btn-3d-blue w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-5 rounded-2xl shadow-2xl transition-all flex items-center justify-center group ${isOpen ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}
        title="Contact Us"
      >
        {isOpen ? (
          <X className="w-7 h-7" />
        ) : (
          <MessageCircle className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        )}
      </motion.button>
    </div>
  );
}
