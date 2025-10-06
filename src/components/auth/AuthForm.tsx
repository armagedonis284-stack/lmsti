import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { BookOpen, Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import AnimatedClassroomIllustration from "../ui/AnimatedClassroomIllustration";

type AuthType = "login" | "forgot-password";

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
          className={`block w-full pl-10 pr-10 py-3 border rounded-lg shadow-sm placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     transition-colors duration-200 ${
                       error 
                         ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
                         : "border-gray-300 hover:border-gray-400"
                     }`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
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

const AuthForm: React.FC = () => {
  const [authType, setAuthType] = useState<AuthType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const { signIn, studentSignIn, studentForgotPassword, loading } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setEmailError("");
    setPasswordError("");

    // Validation
    if (!email) {
      setEmailError("Email harus diisi");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Format email tidak valid");
      return;
    }
    if (authType === "login" && !password) {
      setPasswordError("Password harus diisi");
      return;
    }

    try {
      if (authType === "login") {
        // Check if we're on mobile and add mobile-specific handling
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          console.log('Mobile device detected, using mobile-optimized login');
        }

        // Try teacher login first (Supabase Auth)
        const { error: teacherError } = await signIn(email, password);

        if (teacherError) {
          console.log('Teacher login failed, trying student login:', teacherError.message);
          // If teacher login fails, try student login
          const { error: studentError } = await studentSignIn(email, password);
          if (studentError) {
            console.error('Student login also failed:', studentError.message);
            throw studentError;
          }
        }
      } else if (authType === "forgot-password") {
        const { error } = await studentForgotPassword(email);
        if (error) throw error;
        setFeedback({
          type: "success",
          message: "Password baru telah dikirim ke email Anda (format: DDMMYYYY sesuai tanggal lahir).",
        });
        setAuthType("login");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Mobile-specific error messages
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let errorMessage = error.message || "Terjadi kesalahan";
      
      if (isMobile && error.message?.includes('fetch')) {
        errorMessage = "Koneksi internet bermasalah. Pastikan HP terhubung ke internet dan coba lagi.";
      } else if (isMobile && error.message?.includes('CORS')) {
        errorMessage = "Masalah konfigurasi server. Silakan hubungi administrator.";
      }
      
      setFeedback({ type: "error", message: errorMessage });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Minimalist Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 relative overflow-hidden">
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Organic divider */}
        <div className="absolute -right-12 top-0 bottom-0 w-24">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 Q20,20 0,40 Q20,60 0,80 Q20,90 0,100 L100,100 L100,0 Z" fill="#f9fafb" fillOpacity="0.08" />
          </svg>
        </div>
        
         <div className="relative z-10 flex flex-col items-center justify-center text-white p-12 w-full">
           {/* Main illustration */}
           <div className="mb-12">
             <AnimatedClassroomIllustration />
           </div>

          {/* Brand */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-3">ClassRoom</h1>
            <p className="text-lg text-blue-100 font-light">
              Kelola kelas dengan lebih mudah
            </p>
          </div>
        </div>
        
        {/* Subtle decorative blur */}
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-32 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">ClassRoom</h1>
          </div>

          {/* Form Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {authType === "login" ? "Halo!" : "Reset Password"}
            </h2>
            <p className="text-gray-600">
              {authType === "login" 
                ? "Silakan login untuk melanjutkan" 
                : "Kami akan kirim password baru ke email kamu"}
            </p>
          </div>

          {feedback && <AlertBox type={feedback.type} message={feedback.message} />}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
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
              />

              {authType === "login" && (
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
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-white font-semibold text-base
                           bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                           transform hover:scale-[1.01] active:scale-[0.99] shadow-md"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Tunggu sebentar...
                  </div>
                ) : (
                  authType === "login" ? "Masuk" : "Reset Password"
                )}
              </button>
            </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            {authType === "login" ? (
              <button
                onClick={() => setAuthType("forgot-password")}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                Lupa password?
              </button>
            ) : (
              <button
                onClick={() => setAuthType("login")}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                Kembali ke login
              </button>
            )}
          </div>

          {/* Info boxes - casual tone */}
          <div className="mt-8 space-y-3">
            <div className="p-3.5 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-900">
                <span className="font-semibold">💡 Info:</span> Sistem otomatis deteksi apakah kamu guru atau siswa dari email yang digunakan
              </p>
            </div>

            {authType === "login" && (
              <div className="p-3.5 bg-amber-50 rounded-lg text-sm">
                <p className="text-amber-900">
                  <span className="font-semibold">🔑 Password siswa:</span> Format tanggal lahir (DDMMYYYY), contoh: 15082005
                </p>
              </div>
            )}

            {authType === "forgot-password" && (
              <div className="p-3.5 bg-green-50 rounded-lg text-sm">
                <p className="text-green-900">
                  <span className="font-semibold">✓ Password direset:</span> Ke tanggal lahir kamu (DDMMYYYY)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;