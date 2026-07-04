import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/authApi';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
            <div className="w-32 h-32 rounded-full overflow-hidden flex justify-center items-start shadow-2xl shadow-primary/20 bg-white border-4 border-white mb-6">
              <img src="/logo.png" alt="DOOARS GREEN Logo" className="h-[120%] max-w-none -mt-[10%]" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-primary text-center">Register</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold tracking-widest uppercase">Create Manager Account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide ml-1 text-on-surface-variant">Full Name</label>
              <div className="relative group focus-glow rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">person</span>
                <input type="text" required placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide ml-1 text-on-surface-variant">Phone Number</label>
              <div className="relative group focus-glow rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">call</span>
                <input type="tel" required placeholder="Enter phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide ml-1 text-on-surface-variant">Password</label>
              <div className="relative group focus-glow rounded-xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">lock</span>
                <input type="password" required placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 focus:outline-none focus:border-primary text-sm" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="tea-gradient-btn w-full py-4 rounded-xl flex items-center justify-center gap-2">
                <span className="text-white font-bold text-sm">{loading ? 'Creating...' : 'Create Account'}</span>
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col items-center gap-2">
            <p className="text-xs text-on-surface-variant">Already have an account?</p>
            <Link to="/login" className="text-sm font-bold text-primary hover:underline underline-offset-4 flex items-center gap-1">
              Sign In <span className="material-symbols-outlined text-[16px]">login</span>
            </Link>
          </div>
        </div>

        {/* Status bar */}
        <div className="fixed bottom-6 left-6 z-50 opacity-85 pointer-events-none animate-fade-up">
          <div className="flex items-center gap-4 px-5 py-2.5 glass-panel rounded-full border border-white/10 bg-black/20 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-[#4CAF50] rounded-full shadow-[0_0_8px_#4CAF50]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">CREATED BY: SANJIB</span>
            </div>
            <div className="w-[1px] h-3.5 bg-white/20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">SESSION V0.1</span>
          </div>
        </div>
      </main>
    </div>
  );
}
