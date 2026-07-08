// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/roleConfig";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import RolesSection from "../components/landing/RolesSection";
import ModulesSection from "../components/landing/ModulesSection";
import ComplianceSection from "../components/landing/ComplianceSection";
import CTASection from "../components/landing/CTASection";
import FooterSection from "../components/landing/FooterSection";
import axiosInstance from "@/api/axiosInstance";
import {useNavigate} from "react-router-dom";
import { useAuth } from '@/lib/AuthContext';
import {signIn} from "@/tests/signIn"
import {signUp} from "@/tests/signUp"
const resolveTarget = (fromUrl, fallback) => {
  if (fromUrl) {
    try {
      const resolved = new URL(fromUrl, window.location.origin);
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch (_) {
      return fromUrl;
    }
  }
  return fallback;
};

const AuthCard = ({ mode, setMode, fromUrl, clearAuthQuery }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {checkUserAuth} = useAuth();
  const navigate = useNavigate();

  const cardTitle = mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome to CareCore AI";

  // const handleSignIn = async (event) => {
  //   event.preventDefault();
  //   setError("");
  //   setNotice("");
  //   setIsSubmitting(true);

  //   try {
  //     const session = await base44.auth.login({ email, password });
  //     const target = resolveTarget(fromUrl, ROLE_DASHBOARD_ROUTES[session?.user?.role] || "/dashboard");
  //     window.location.assign(target);
  //   } catch (loginError) {
  //     setError(loginError.message || "Sign in failed");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };
  // const handleSignIn = async (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setIsSubmitting(true);
  //   try {
  //     const response = await axiosInstance.post('/auth/login', {email, password});
  //     if (response.data.status === "success") {
  //       const token = response.data.data.access_token;
  //       sessionStorage.setItem('access_token', token);
  //       sessionStorage.setItem('token', token);
  //       sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
  //       await checkUserAuth();
  //       setEmail("");
  //       setPassword("");
  //       navigate(ROLE_DASHBOARD_ROUTES[response.data.data.user?.role] || "/dashboard");
  //     }
  //   } catch(error) {
  //     const msg =
  //       error?.response?.data?.error?.message ||
  //       error?.response?.data?.message ||
  //       "Login failed. Please check your credentials and try again.";
  //     setError(msg);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

 
  const handleSignIn = async (e) => {
  e.preventDefault();
  setError("");
  setIsSubmitting(true);

  const result = await signIn({ email, password, checkUserAuth });

  if (result.success) {
    setEmail("");
    setPassword("");
    navigate(result.target);
  } else {
    setError(result.error);
  }

  setIsSubmitting(false);
};

  // const handleSignUp = async (event) => {
  //   event.preventDefault();
  //   setError("");
  //   setNotice("");

  //   if (!password || password.length < 8) {
  //     setError("Password must be at least 8 characters.");
  //     return;
  //   }

  //   if (password !== confirmPassword) {
  //     setError("Passwords do not match.");
  //     return;
  //   }

  //   setIsSubmitting(true);

  //   try {
  //     await base44.auth.register({
  //       email,
  //       password,
  //       full_name: email.split("@")[0] || "CareCore User",
  //       role: "support_worker",
  //     });
  //     setNotice("Account created. Please sign in.");
  //     setMode("login");
  //     setPassword("");
  //     setConfirmPassword("");
  //   } catch (signupError) {
  //     setError(signupError.message || "Account creation failed");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if(!password || password.length < 8){
      setError("Password must be at least 8 characters.")
    }
    if(password !== confirmPassword){
      setError("Passwords do not match")
      return;
    }
    setIsSubmitting(true);
    try {
 
    const result = await signUp({email, password, confirmPassword})
    if (result != null){
        setNotice("Account created. Please sign in.");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    }
   
    }catch(error){
      setError(error.message || "Account creation failed")
    } finally{
      setIsSubmitting(false);
    }
  }

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("If this email exists, a reset link would be sent. (Local reset endpoint not implemented yet.)");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#d2d6dc" }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-500/20 p-8">
        {mode !== "login" ? (
          <button onClick={() => setMode("login")} className="flex items-center text-slate-500 text-sm font-medium mb-4 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
          </button>
        ) : (
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 shadow-lg" />
        )}

        <h1 className="text-4xl font-bold text-center text-slate-900 mb-2">{cardTitle}</h1>
        <p className="text-center text-slate-500 mb-6">
          {mode === "signup" ? "Create a local account to continue" : mode === "reset" ? "Enter your email and we'll send you a link to reset your password" : "Sign in to continue"}
        </p>

        {mode === "login" && (
          <button type="button" className="w-full h-12 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-600 font-semibold mb-4">
            <span className="text-lg">G</span> Continue with Google
          </button>
        )}

        {mode === "login" && (
          <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
            <div className="h-px bg-slate-200 flex-1" /> OR <div className="h-px bg-slate-200 flex-1" />
          </div>
        )}

        {mode === "login" && (
          <form className="space-y-4" onSubmit={handleSignIn}>
            <label className="block text-sm font-semibold text-slate-600">Email
              <div className="mt-2 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3" placeholder="you@example.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <label className="block text-sm font-semibold text-slate-600">Password
              <div className="mt-2 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-10" placeholder="••••••••" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800">{isSubmitting ? "Signing in..." : "Sign in"}</Button>
            <div className="flex justify-between text-sm text-slate-500">
              <button type="button" onClick={() => setMode("reset")} className="hover:text-slate-700">Forgot password?</button>
              {/* TODO: Add sign up */}
               <button type="button" onClick={() => setMode("signup")} className="hover:text-slate-700">Need an account? <span className="font-semibold">Sign up</span></button> 
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form className="space-y-4" onSubmit={handleSignUp}>
            <label className="block text-sm font-semibold text-slate-600">Email
              <div className="mt-2 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3" placeholder="you@example.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <label className="block text-sm font-semibold text-slate-600">Password
              <div className="mt-2 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-10" placeholder="Min. 8 characters" type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            <label className="block text-sm font-semibold text-slate-600">Confirm Password
              <div className="mt-2 relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-10" placeholder="Re-enter password" type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 mt-1 font-normal">Passwords match</p>
              )}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1 font-normal">Passwords do not match</p>
              )}
            </label>
            <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800">{isSubmitting ? "Creating account..." : "Create account"}</Button>
          </form>
        )}

        {mode === "reset" && (
          <form className="space-y-4" onSubmit={handleReset}>
            <label className="block text-sm font-semibold text-slate-600">Email
              <div className="mt-2 relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3" placeholder="you@example.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <Button type="submit" className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800">Send reset link</Button>
          </form>
        )}

        {(error || notice) && (
          <p className={`mt-4 text-sm text-center ${error ? "text-red-600" : "text-green-700"}`}>
            {error || notice}
          </p>
        )}

        <div className="mt-4 text-center">
          <button type="button" className="text-xs text-slate-400 hover:text-slate-600" onClick={clearAuthQuery}>Return to landing page</button>
        </div>
      </div>
    </div>
  );
};

export default function Landing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get("from_url");
  const authParam = searchParams.get("auth");
  const initialMode = authParam === "signup" || authParam === "reset" ? authParam : authParam === "login" ? "login" : null;
  const [authMode, setAuthMode] = useState(initialMode);

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!authMode) return;
    base44.auth.me().then((user) => {
      if (!user) return;
      const target = resolveTarget(fromUrl, ROLE_DASHBOARD_ROUTES[user.role] || "/dashboard");
      window.location.assign(target);
    }).catch(() => {});
  }, [authMode, fromUrl]);

  const clearAuthQuery = () => {
    setSearchParams({});
    setAuthMode(null);
  };

  const showAuth = useMemo(() => Boolean(authMode), [authMode]);

  if (showAuth) {
    return <AuthCard mode={authMode} setMode={setAuthMode} fromUrl={fromUrl} clearAuthQuery={clearAuthQuery} />;
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <ModulesSection />
      <ComplianceSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}
