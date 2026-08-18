import React from "react";
import { AlertCircle } from "lucide-react";

interface LoginPageProps {
  error?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ error }) => {
  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleEmailLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGoogleLogin();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans selection:bg-[#00B04F] selection:text-white">
      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white border border-gray-200/80 rounded-2xl p-9 shadow-[0_4px_30px_rgba(0,0,0,0.04)] flex flex-col items-center">
        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-7">Login</h1>

        {error && (
          <div className="w-full flex items-center gap-2 p-3 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login with Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#EAF7EE] hover:bg-[#DDF2E3] text-[#1B5E20] font-medium text-sm border border-[#C8E6C9]/60 transition-all active:scale-[0.99] mb-5"
        >
          {/* Real Google Colored Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-normal">or sign up through email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLoginSubmit} className="w-full space-y-3 mt-4">
          <div>
            <input
              type="email"
              placeholder="Email ID"
              defaultValue="demo.user@reachinbox.ai"
              className="w-full px-4 py-3 text-sm rounded-xl bg-[#F4F5F7] border border-transparent text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              defaultValue="••••••••"
              className="w-full px-4 py-3 text-sm rounded-xl bg-[#F4F5F7] border border-transparent text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 rounded-xl bg-[#00A843] hover:bg-[#00933B] text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.99] mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};