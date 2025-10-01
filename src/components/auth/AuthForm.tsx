import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const AuthForm: React.FC = () => {
  const [authType, setAuthType] = useState<'teacher-login' | 'student-login' | 'student-forgot'>('teacher-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signIn, studentSignIn, studentForgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authType === 'teacher-login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else if (authType === 'student-login') {
        const { error } = await studentSignIn(email, password);
        if (error) throw error;
      } else if (authType === 'student-forgot') {
        const { error } = await studentForgotPassword(email);
        if (error) throw error;
        setSuccess('Password baru telah dikirim ke email Anda (menggunakan tanggal lahir format DDMMYYYY)');
        setAuthType('student-login');
      }
      
      // Navigation will be handled by the AuthContext
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ClassRoom</h1>
          <p className="text-gray-600 mt-2">
            {authType === 'teacher-login' && 'Login sebagai Guru'}
            {authType === 'student-login' && 'Login sebagai Siswa'}
            {authType === 'student-forgot' && 'Lupa Password Siswa'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {authType !== 'student-forgot' && (
            <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Loading...' : (
              authType === 'teacher-login' ? 'Login Guru' :
              authType === 'student-login' ? 'Login Siswa' :
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <div className="flex flex-col space-y-2">
            {authType !== 'teacher-login' && (
              <button
                onClick={() => {
                  setAuthType('teacher-login');
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Login sebagai Guru
              </button>
            )}
            
            
            {authType !== 'student-login' && (
              <button
                onClick={() => {
                  setAuthType('student-login');
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Login sebagai Siswa
              </button>
            )}
            
            {authType === 'student-login' && (
              <button
                onClick={() => {
                  setAuthType('student-forgot');
                  setError('');
                  setSuccess('');
                  setPassword('');
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Lupa Password?
              </button>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              <strong>Catatan:</strong> Akun siswa hanya bisa dibuat oleh guru melalui menu "Manage Siswa"
            </p>
          </div>
          
          {authType === 'student-forgot' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Info:</strong> Password akan direset ke tanggal lahir Anda dalam format DDMMYYYY
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;