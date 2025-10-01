import React, { useState } from 'react';
import { User, Mail, Calendar, Phone, MapPin, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const StudentProfile: React.FC = () => {
  const { profile, studentAuth, studentProfile, updateStudentProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [email, setEmail] = useState(studentAuth?.email || profile?.email || '');
  const [birthDate, setBirthDate] = useState(studentProfile?.birth_date || '');
  const [phone, setPhone] = useState(studentProfile?.phone || '');
  const [address, setAddress] = useState(studentProfile?.address || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = {
        email,
        birth_date: birthDate,
        phone: phone || null,
        address: address || null,
      };

      // Add password if changing
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Password baru tidak cocok');
        }
        if (newPassword.length < 6) {
          throw new Error('Password minimal 6 karakter');
        }
        updateData.password = newPassword;
      }

      const { error } = await updateStudentProfile(updateData);
      if (error) throw error;

      setSuccess('Profil berhasil diperbarui');
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(error.message || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEmail(studentAuth?.email || profile?.email || '');
    setBirthDate(studentProfile?.birth_date || '');
    setPhone(studentProfile?.phone || '');
    setAddress(studentProfile?.address || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profil Saya</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Profil
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User size={16} className="mr-2" />
                Nama Lengkap
              </label>
              <input
                type="text"
                value={profile?.full_name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Nama tidak dapat diubah</p>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} className="mr-2" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                required
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isEditing ? 'focus:outline-none focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-500'
                }`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="mr-2" />
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={!isEditing}
                required
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isEditing ? 'focus:outline-none focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-500'
                }`}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} className="mr-2" />
                No. Telepon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isEditing ? 'focus:outline-none focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="mr-2" />
              Alamat
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!isEditing}
              rows={3}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                isEditing ? 'focus:outline-none focus:ring-blue-500 focus:border-blue-500' : 'bg-gray-50 text-gray-500'
              }`}
            />
          </div>

          {isEditing && (
            <div className="border-t pt-6">
              <h3 className="flex items-center text-lg font-medium text-gray-800 mb-4">
                <Lock size={20} className="mr-2" />
                Ubah Password (Opsional)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kosongkan jika tidak ingin mengubah"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>
            </div>
          )}

          {isEditing && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">Informasi Password Default</h3>
        <p className="text-sm text-yellow-700">
          Password default Anda adalah tanggal lahir dalam format DDMMYYYY. 
          Contoh: jika lahir 15 Januari 1990, maka password adalah 15011990.
        </p>
      </div>
    </div>
  );
};

export default StudentProfile;