import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/SimpleAuthContext";
import { BookOpen, Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import AnimatedClassroomIllustration from "../ui/AnimatedClassroomIllustration";

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  error?: string;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  autoFocus = false,
  placeholder,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false,
  error,
  disabled = false,
}) => {
  const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;
  
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {type === "email" ? (
            <Mail className="h-5 w-5 text-gray-400" />
          ) : type === "password" ? (
            <Lock className="h-5 w-5 text-gray-400" />
          ) : null}
        </div>
        <input
          type={inputType}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full pl-10 pr-10 py-4 border rounded-lg shadow-sm placeholder-gray-400 text-base
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition-colors duration-200 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                       error 
                         ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
                         : "border-gray-300 hover:border-gray-400"
                     }`}
          style={{ fontSize: '16px' }} // Prevents zoom on iOS
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center space-x-1 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

const AlertBox: React.FC<{ type: "error" | "success"; message: string }> = ({
  type,
  message,
}) => (
  <div
    className={`flex items-center space-x-2 px-4 py-3 rounded-lg mb-4 text-sm ${
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-green-50 border border-green-200 text-green-700"
    }`}
  >
    {type === "error" ? (
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
    ) : (
      <CheckCircle className="h-5 w-5 flex-shrink-0" />
    )}
    <span>{message}</span>
  </div>
);

const SimpleAuthForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, loading } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setEmailError("");
    setPasswordError("");
    setFeedback(null);
    setIsSubmitting(true);

    // Validation
    if (!email) {
      setEmailError("Email harus diisi");
      setIsSubmitting(false);
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Format email tidak valid");
      setIsSubmitting(false);
      return;
    }
    if (!password) {
      setPasswordError("Password harus diisi");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        // Show success message briefly
        setFeedback({
          type: "success",
          message: `Login berhasil! Selamat datang ${result.userType === 'teacher' ? 'Guru' : 'Siswa'}.`
        });
        
        // Navigate after short delay
        setTimeout(() => {
          const dashboardPath = result.userType === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
          navigate(dashboardPath, { replace: true });
        }, 1000);
      } else {
        // Show specific error message
        setFeedback({
          type: "error",
          message: result.error || "Login gagal. Silakan coba lagi."
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan. Silakan coba lagi."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="absolute -right-12 top-0 bottom-0 w-24">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 Q20,20 0,40 Q20,60 0,80 Q20,90 0,100 L100,100 L100,0 Z" fill="#f9fafb" fillOpacity="0.08" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-white p-12 w-full">
          <div className="mb-12">
            <AnimatedClassroomIllustration />
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold mb-3">ClassRoom</h1>
            <p className="text-lg text-blue-100 font-light">
              Kelola kelas dengan lebih mudah
            </p>
          </div>
        </div>
        
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-32 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">ClassRoom</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Halo!
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Silakan login untuk melanjutkan
            </p>
          </div>

          {feedback && <AlertBox type={feedback.type} message={feedback.message} />}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <InputField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoFocus
              placeholder="nama@email.com"
              error={emailError}
              disabled={isLoading}
            />

            <InputField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
              placeholder="Masukkan password"
              showPasswordToggle
              onTogglePassword={() => setShowPassword(!showPassword)}
              showPassword={showPassword}
              error={passwordError}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 rounded-lg text-white font-semibold text-base
                         bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                         transform hover:scale-[1.01] active:scale-[0.99] shadow-md touch-manipulation
                         min-h-[48px]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {isSubmitting ? "Memproses..." : "Memuat..."}
                </div>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Info boxes */}
          <div className="mt-6 space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg text-xs sm:text-sm">
              <p className="text-blue-900">
                <span className="font-semibold">💡 Info:</span> Sistem otomatis deteksi apakah kamu guru atau siswa dari email yang digunakan
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg text-xs sm:text-sm">
              <p className="text-amber-900">
                <span className="font-semibold">🔑 Password siswa:</span> Format tanggal lahir (DDMMYYYY), contoh: 15082005
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAuthForm;
