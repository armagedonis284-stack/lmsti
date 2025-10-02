import React, { useState } from 'react';
import { Save, Eye, EyeOff, User, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EditProfile: React.FC = () => {
  const { studentProfile, updateStudentProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: studentProfile?.full_name || '',
    email: studentProfile?.email || '',
    phone: studentProfile?.phone || '',
    address: studentProfile?.address || '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Password konfirmasi tidak cocok' });
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password minimal 6 karakter' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const { error } = await updateStudentProfile(updateData);

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Gagal memperbarui profil' });
      } else {
        setMessage({ type: 'success', text: 'Profil berhasil diperbarui' });
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat memperbarui profil' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (message) setMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Profil</h1>

        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nama Lengkap */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User size={16} />
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* No. Telepon */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone size={16} />
              No. Telepon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} />
              Alamat
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Baru (kosongkan jika tidak ingin diubah)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          {formData.password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  minLength={6}
                  required={!!formData.password}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;