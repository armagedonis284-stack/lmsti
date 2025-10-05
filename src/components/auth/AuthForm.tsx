import React, { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { BookOpen } from "lucide-react";

type AuthType = "login" | "forgot-password";

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  autoFocus = false,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      autoFocus={autoFocus}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

const AlertBox: React.FC<{ type: "error" | "success"; message: string }> = ({
  type,
  message,
}) => (
  <div
    className={`px-4 py-3 rounded mb-4 text-sm ${
      type === "error"
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-green-50 border border-green-200 text-green-700"
    }`}
  >
    {message}
  </div>
);

const AuthForm: React.FC = () => {
  const [authType, setAuthType] = useState<AuthType>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const { signIn, studentSignIn, studentForgotPassword, loading } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      if (authType === "login") {
        // Try teacher login first (Supabase Auth)
        const { error: teacherError } = await signIn(email, password);

        if (teacherError) {
          // If teacher login fails, try student login
          const { error: studentError } = await studentSignIn(email, password);
          if (studentError) throw studentError;
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
      setFeedback({ type: "error", message: error.message || "Terjadi kesalahan" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">ClassRoom</h1>
          <p className="text-gray-600 mt-2">
            {authType === "login" ? "Login ke Sistem" : "Lupa Password"}
          </p>
        </div>

        {feedback && <AlertBox type={feedback.type} message={feedback.message} />}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoFocus
          />

          {authType === "login" && (
            <InputField
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium
                       text-white bg-blue-600 hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Loading..."
              : authType === "login"
              ? "Login"
              : "Reset Password"}
          </button>
        </form>

        {/* Switcher */}
        <div className="mt-6 text-center space-y-2">
          {authType === "login" ? (
            <button
              onClick={() => setAuthType("forgot-password")}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Lupa Password?
            </button>
          ) : (
            <button
              onClick={() => setAuthType("login")}
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              Kembali ke Login
            </button>
          )}

          {/* Notes */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
            <strong>Catatan:</strong> Sistem akan otomatis mendeteksi apakah Anda guru atau siswa.
            <br />Akun siswa hanya bisa dibuat oleh guru melalui menu "Manage Siswa".
            <br />Password default menggunakan format tanggal lahir (DDMMYYYY).
          </div>

          {authType === "forgot-password" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
              <strong>Info:</strong> Password akan direset ke tanggal lahir Anda dalam format DDMMYYYY.
              <br />Contoh: lahir 15 Agustus 2005 → password <code>15082005</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
