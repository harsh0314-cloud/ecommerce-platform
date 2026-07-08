import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Lock, User } from 'lucide-react';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must be different',
  path: ['newPassword'],
});

export default function Profile() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'password'

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data) => {
    try {
      await api.patch('/users/password', data);
      toast.success('Password updated successfully!');
      reset();
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">My Account</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-border">
        <button onClick={() => setActiveTab('info')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Profile Information
        </button>
        <button onClick={() => setActiveTab('password')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'password' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Change Password
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground capitalize">{user?.firstName} {user?.lastName}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 uppercase font-semibold">{user?.role}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Profile information (Name/Email) can currently only be updated by an Administrator via the Admin Panel.</p>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleSubmit(onPasswordSubmit)} className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={20} className="text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Update Password</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
            <input type="password" {...register('currentPassword')} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none" />
            {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
            <input type="password" {...register('newPassword')} className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary outline-none" />
            {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}