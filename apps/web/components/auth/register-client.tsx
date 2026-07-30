"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export function RegisterClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      toast.success("Account created successfully!");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm card p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[--turmeric] rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="font-display text-[#09181a] text-xl">LP</span>
          </div>
          <h1 className="font-display text-2xl text-[--text]">Create Account</h1>
          <p className="text-sm text-[--muted]">Sync your data across all devices</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-[--muted] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[rgba(232,229,217,0.03)] border border-[--line] rounded-lg px-3 py-2 text-sm text-[--text] focus:outline-none focus:border-[--sage]"
              required
            />
          </div>
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
              minLength={8}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[--turmeric] text-[#09181a] font-medium text-sm disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-xs text-[--muted] mt-6">
          Already have an account? <Link href="/login" className="text-[--sage] hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
