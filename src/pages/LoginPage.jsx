import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/authApi';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    phone: localStorage.getItem('savedPhone') || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  // Animate leaves
  useEffect(() => {
    const container = document.getElementById('leaf-particles');
    if (!container) return;
    const createLeaf = () => {
      const leaf = document.createElement('span');
      leaf.className = 'material-symbols-outlined leaf-particle';
      leaf.textContent = 'eco';
      leaf.style.left = Math.random() * 100 + 'vw';
      leaf.style.fontSize = (Math.random() * 20 + 10) + 'px';
      leaf.style.animationDuration = (Math.random() * 10 + 5) + 's';
      leaf.style.color = '#4CAF50';
      container.appendChild(leaf);
      setTimeout(() => leaf.remove(), 15000);
    };
    const interval = setInterval(createLeaf, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('savedPhone', form.phone);
      toast.success('Login Successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid Phone Number or Password');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Leaf particles */}
      <div className="fixed inset-0 z-[5] pointer-events-none" id="leaf-particles" />

      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-10" />
        <div
          className="w-full h-full bg-[size:100%_100%] bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login-bg.png')" }}
        />
      </div>

      {/* Main */}
      <main className="relative z-20 min-h-screen w-full flex items-center justify-center px-4">
        <div className="glass-panel animate-fade-up w-full max-w-[440px] rounded-3xl p-8 md:p-12 relative overflow-hidden leaf-pattern">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden flex justify-center items-start shadow-2xl shadow-primary/20 bg-white border-4 border-white mb-6">
              <img src="/logo.png" alt="TEAnest Logo" className="h-[120%] max-w-none -mt-[10%]" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-primary text-center">Welcome Back</h1>
            <p className="text-on-surface-variant text-sm mt-1 font-semibold tracking-widest uppercase">Sign in to your estate</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div className="space-y-2 animate-fade-up stagger-2">
              <label className="text-label-md text-on-surface-variant ml-1 block text-sm font-semibold tracking-wide">Phone Number</label>
              <div className="relative group focus-glow rounded-xl transition-all">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">call</span>
                <input
                  type="tel"
                  required
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 animate-fade-up stagger-3">
              <label className="text-sm font-semibold text-on-surface-variant tracking-wide ml-1 block">Password</label>
              <div className="relative group focus-glow rounded-xl transition-all">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <div className="flex justify-end pt-1 pr-1">
                <Link to="/forgot-password" className="text-xs text-secondary hover:text-primary transition-colors font-semibold">Forgot Password?</Link>
              </div>
            </div>

            {/* Submit */}
            <div className="animate-fade-up stagger-4 pt-2">
              <button type="submit" disabled={loading} className="tea-gradient-btn w-full py-4 rounded-xl flex items-center justify-center gap-2 group">
                <span className="text-white font-bold text-sm z-10">{loading ? 'Signing In...' : 'Sign In to Estate'}</span>
                <span className="material-symbols-outlined text-white group-hover:rotate-[20deg] transition-transform duration-500 z-10">eco</span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col items-center gap-2 animate-fade-up stagger-4">
            <p className="text-xs text-on-surface-variant">New to the estate network?</p>
            <Link to="/register" className="text-sm font-bold text-primary flex items-center gap-1 hover:underline underline-offset-4">
              Create Account <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Glow blobs */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-secondary/5 rounded-full blur-3xl" />
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
