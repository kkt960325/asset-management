"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export default function NavUser() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated" || !session?.user) return null;

  const { name, email, image } = session.user;
  const initial = name?.[0] ?? email?.[0] ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full focus:outline-none group"
        aria-label="사용자 메뉴"
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? "user"}
            width={28}
            height={28}
            className="rounded-full ring-1 ring-[#1a2540] group-hover:ring-sky-500/50 transition-all"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center font-mono text-[11px] text-sky-400 font-bold group-hover:border-sky-400/60 transition-all">
            {initial.toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* 드롭다운 */}
          <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[#1a2540] bg-[#0c1121] shadow-2xl shadow-black/50 overflow-hidden animate-fade-in-up">
            {/* 사용자 정보 */}
            <div className="px-4 py-3 border-b border-[#1a2540]">
              <p className="text-[11px] font-semibold text-[#e2e8f8] truncate">{name}</p>
              <p className="text-[10px] text-[#3a4a6a] truncate mt-0.5">{email}</p>
            </div>

            {/* 로그아웃 */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full px-4 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
