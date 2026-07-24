"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { generateWhatsAppText } from "@/lib/whatsappExport";
import { useApp } from "@/context/AppContext";

export function WhatsAppExport() {
  const { draftResult, teamConfig } = useApp();
  const [copied, setCopied] = useState(false);

  if (!draftResult) return null;

  const handleCopy = async () => {
    const text = generateWhatsAppText(draftResult, teamConfig);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="mb-2 text-lg font-bold text-white">WhatsApp Kadro Çıktısı</h3>
      <p className="mb-4 text-sm text-zinc-400">
        Kadroları WhatsApp formatında panoya kopyalayın
      </p>

      <button
        type="button"
        onClick={handleCopy}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all sm:w-auto sm:px-6 ${
          copied
            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
            : "bg-green-600 text-white hover:bg-green-500"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Panoya kopyalandı!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            WhatsApp Metnini Kopyala
          </>
        )}
      </button>

      <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-400 whitespace-pre-wrap">
        {generateWhatsAppText(draftResult, teamConfig)}
      </pre>
    </div>
  );
}
