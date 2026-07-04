import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../api/authApi';

export default function SettingsModal({ isOpen, onClose, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'
  
  // Profile Form States
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Show/Hide password toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Fetch profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('profile');
      fetchProfile();
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setFetchingProfile(true);
    try {
      const { data } = await authAPI.getProfile();
      if (data && data.success) {
        setProfileForm({
          name: data.data.name || '',
          phone: data.data.phone || '',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load profile details');
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.phone.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await authAPI.updateProfile(profileForm);
      if (data && data.success) {
        toast.success('Profile updated successfully!');
        // Update saved phone in localStorage if it was the login credential
        if (localStorage.getItem('savedPhone')) {
          localStorage.setItem('savedPhone', profileForm.phone);
        }
        onProfileUpdate?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { data } = await authAPI.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (data && data.success) {
        toast.success('Password changed successfully!');
        // Update saved password in localStorage if present
        if (localStorage.getItem('savedPassword')) {
          localStorage.setItem('savedPassword', newPassword);
        }
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Close modal on escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp relative leaf-pattern p-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-all active:scale-90 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <h2 className="font-headline text-2xl font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl">settings</span>
            Account Settings
          </h2>
          <p className="text-on-surface-variant text-xs mt-1">Manage your account credentials and profile details.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-outline-variant/30 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${
              activeTab === 'password'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">lock</span>
            Change Password
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' ? (
          fetchingProfile ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              <p className="text-xs text-on-surface-variant mt-2 font-medium">Fetching profile...</p>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant ml-1">Full Name</label>
                <div className="relative group focus-glow rounded-xl transition-all">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">person</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant ml-1">Phone Number</label>
                <div className="relative group focus-glow rounded-xl transition-all">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">call</span>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={savingProfile}
                className="tea-gradient-btn w-full mt-6 py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-sm shadow-md"
              >
                {savingProfile ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Saving Profile...
                  </>
                ) : (
                  <>
                    Save Profile
                    <span className="material-symbols-outlined text-sm">check</span>
                  </>
                )}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1">Current Password</label>
              <div className="relative group focus-glow rounded-xl transition-all">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">lock</span>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showCurrentPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1">New Password</label>
              <div className="relative group focus-glow rounded-xl transition-all">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">lock_reset</span>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showNewPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant ml-1">Confirm Password</label>
              <div className="relative group focus-glow rounded-xl transition-all">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">lock_open</span>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-outline-variant bg-surface-container-low/50 text-on-surface focus:outline-none focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{showConfirmPass ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit Password Button */}
            <button
              type="submit"
              disabled={changingPassword}
              className="tea-gradient-btn w-full mt-6 py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-sm shadow-md"
            >
              {changingPassword ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Updating Password...
                </>
              ) : (
                <>
                  Change Password
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
