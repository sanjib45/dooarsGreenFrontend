import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/authApi';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', newPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.resetPassword(form);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center p-4">
      <div className="fixed inset-0 z-0 bg-primary/20 mix-blend-overlay" />
      <div className="fixed inset-0 z-0 bg-[size:100%_100%] bg-center bg-no-repeat" style={{ backgroundImage: "url('/login-bg.png')" }} />
      
      <main className="relative z-20 w-full max-w-[440px]">
        <div className="glass-panel w-full rounded-3xl p-8 md:p-12 relative overflow-hidden leaf-pattern">
          <div className="flex flex-col items-center mb-8">
            <Logo className="mb-6" />
            <h1 className="font-headline text-3xl font-bold text-primary text-center">Reset Password</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold tracking-widest uppercase">Recover Your Account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide ml-1 text-on-surface-variant">Phone Number</label>
              <div className="relative group focus-glow rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">call</span>
                <input type="tel" required placeholder="Enter phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide ml-1 text-on-surface-variant">New Password</label>
              <div className="relative group focus-glow rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">lock</span>
                <input type="password" required placeholder="••••••••" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="tea-gradient-btn w-full py-4 rounded-xl flex items-center justify-center gap-2">
                <span className="text-white font-bold text-sm">{loading ? 'Resetting...' : 'Reset Password'}</span>
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col items-center gap-2">
            <Link to="/login" className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
