"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import React from "react";

const slides = [
  {
    title: "Welcome to D-Domain",
    text: "This is a decentralized, fair, and trustless domain ownership system built on Ethereum. Your wallet is your identity.",
    img: "/onboard_identity.png",
  },
  {
    title: "How Auctions Work (Commit → Reveal → Finalize)",
    text: "Bid privately, reveal publicly, and the highest valid reveal wins ownership. This prevents cheating or bidding manipulation.",
    img: "/onboard_auction.png",
  },
  {
    title: "Owning & Resolving Domains",
    text: "Once you win a domain, you can resolve it to your wallet address. Others can send funds to your name instead of a long address.",
    img: "/onboard_resolve.png",
  },
];

export default function OnboardingModal({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [step, setStep] = React.useState(0);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl p-8 w-[90%] max-w-lg text-center space-y-6"
        >
          <button onClick={() => setOpen(false)} className="absolute top-4 right-4 opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>

          <Image src={slides[step].img} alt="" width={200} height={200} className="mx-auto" />
          <h2 className="text-2xl font-bold">{slides[step].title}</h2>
          <p className="opacity-80">{slides[step].text}</p>

          <div className="flex justify-between items-center pt-4">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < slides.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setOpen(false)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer">
                Get Started
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
