"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
    title?: string;
    onBack?: () => void;
    showRefresh?: boolean;
    onRefresh?: () => void;
    isLoading?: boolean;
    className?: string;
}

export function BackButton({
    title,
    onBack,
    showRefresh = false,
    onRefresh,
    isLoading = false,
    className = ""
}: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <div className={`flex items-center justify-between mb-6 px-1 ${className}`}>
            <motion.button
                onClick={handleBack}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors ios-button min-h-[44px] min-w-[44px]"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </motion.button>

            {title && (
                <h1 className="mobile-text-xl font-bold text-white">{title}</h1>
            )}

            {showRefresh && onRefresh ? (
                <motion.button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                    whileHover={{ scale: isLoading ? 1 : 1.1 }}
                    whileTap={{ scale: isLoading ? 1 : 0.95 }}
                    title="Refresh"
                >
                    <svg
                        className={`w-5 h-5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                    </svg>
                </motion.button>
            ) : (
                <div className="w-10 h-10" />
            )}
        </div>
    );
}