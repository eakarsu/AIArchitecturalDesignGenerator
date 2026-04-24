import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { ArrowLeft, User, Lock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 animate-fade-in"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <h1 className="mb-8 text-2xl font-bold text-slate-100 animate-fade-in">Profile Settings</h1>

        {/* Profile Info */}
        <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 animate-slide-up">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <User size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Profile Information</h2>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="form-input opacity-60 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="form-label">Member Since</label>
              <input
                type="text"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                disabled
                className="form-input opacity-60 cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {savingProfile ? <span className="spinner" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 animate-slide-up">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <Lock size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
              >
                {savingPassword ? <span className="spinner" /> : <Lock size={16} />}
                Change Password
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
