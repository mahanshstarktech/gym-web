"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchApi<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("lp_token", res.token);
      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm card p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-3">
            <img src="/icons/icon-192.png" alt="ForgeRX" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-2xl text-[--text]">ForgeRX</h1>
          <p className="text-sm text-[--muted]">Your cut. Engineered.</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-[--muted] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[rgba(232,229,217,0.03)] border border-[--line] rounded-lg px-3 py-2 text-sm text-[--text] focus:outline-none focus:border-[--sage]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-[--muted] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[rgba(232,229,217,0.03)] border border-[--line] rounded-lg px-3 py-2 text-sm text-[--text] focus:outline-none focus:border-[--sage]"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[--turmeric] text-[#09181a] font-medium text-sm disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-[--muted] mt-6">
          Don't have an account? <Link href="/register" className="text-[--sage] hover:underline">Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
}
