import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface PromptOptions {
    title?: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
    showPrompt: (options: PromptOptions) => Promise<string | null>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const ToastContext = createContext<ToastContextValue>({
    toast: () => { },
    showConfirm: async () => false,
    showPrompt: async () => null,
});

export const useToast = () => useContext(ToastContext);

// ─── Icons map ────────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
};

const COLORS: Record<ToastType, { bg: string; text: string; border: string; icon: string }> = {
    success: {
        bg: "bg-white",
        border: "border-green-200",
        text: "text-gray-800",
        icon: "text-green-500",
    },
    error: {
        bg: "bg-white",
        border: "border-red-200",
        text: "text-gray-800",
        icon: "text-red-500",
    },
    warning: {
        bg: "bg-white",
        border: "border-yellow-200",
        text: "text-gray-800",
        icon: "text-yellow-500",
    },
    info: {
        bg: "bg-white",
        border: "border-blue-200",
        text: "text-gray-800",
        icon: "text-blue-500",
    },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────
const ToastItem = ({
    toast,
    onDismiss,
}: {
    toast: Toast;
    onDismiss: (id: string) => void;
}) => {
    const c = COLORS[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`flex items-start gap-3 min-w-[280px] max-w-sm w-full ${c.bg} border ${c.border} rounded-2xl shadow-lg shadow-black/10 px-4 py-3.5 pointer-events-auto`}
        >
            <span className={`mt-0.5 shrink-0 ${c.icon}`}>{ICONS[toast.type]}</span>
            <span className={`text-sm font-semibold leading-snug ${c.text} flex-1`}>
                {toast.message}
            </span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
            >
                <X size={15} />
            </button>
        </motion.div>
    );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
const ConfirmDialog = ({
    options,
    onResolve,
}: {
    options: ConfirmOptions;
    onResolve: (result: boolean) => void;
}) => {
    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
                    <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center ${options.danger
                            ? "bg-red-50 text-red-500"
                            : "bg-blue-50 text-blue-500"
                            }`}
                    >
                        {options.danger ? (
                            <AlertTriangle size={26} />
                        ) : (
                            <Info size={26} />
                        )}
                    </div>
                    {options.title && (
                        <h3 className="text-lg font-black text-gray-900 leading-tight">
                            {options.title}
                        </h3>
                    )}
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        {options.message}
                    </p>
                </div>

                {/* Buttons */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={() => onResolve(false)}
                        className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        {options.cancelText ?? "Cancelar"}
                    </button>
                    <button
                        onClick={() => onResolve(true)}
                        className={`flex-1 py-3 text-white font-bold rounded-xl transition-all text-sm shadow-lg ${options.danger
                            ? "bg-red-500 hover:bg-red-600 shadow-red-100"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                            }`}
                    >
                        {options.confirmText ?? "Confirmar"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Prompt Dialog ────────────────────────────────────────────────────────────
const PromptDialog = ({
    options,
    onResolve,
}: {
    options: PromptOptions;
    onResolve: (result: string | null) => void;
}) => {
    const [value, setValue] = useState(options.defaultValue ?? "");

    const handleConfirm = () => {
        onResolve(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm();
        if (e.key === "Escape") onResolve(null);
    };

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100"
            >
                <div className="px-6 pt-6 pb-4 flex flex-col gap-3">
                    {options.title && (
                        <h3 className="text-lg font-black text-gray-900">{options.title}</h3>
                    )}
                    <p className="text-sm text-gray-500 font-medium">{options.message}</p>
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={options.placeholder ?? ""}
                        className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={() => onResolve(null)}
                        className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
                    >
                        {options.confirmText ?? "Aceptar"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<{
        options: ConfirmOptions;
        resolve: (v: boolean) => void;
    } | null>(null);
    const [promptState, setPromptState] = useState<{
        options: PromptOptions;
        resolve: (v: string | null) => void;
    } | null>(null);

    const idRef = useRef(0);

    const toast = useCallback((message: string, type: ToastType = "info") => {
        const id = String(++idRef.current);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ options, resolve });
        });
    }, []);

    const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setPromptState({ options, resolve });
        });
    }, []);

    const handleConfirmResolve = (result: boolean) => {
        confirmState?.resolve(result);
        setConfirmState(null);
    };

    const handlePromptResolve = (result: string | null) => {
        promptState?.resolve(result);
        setPromptState(null);
    };

    return (
        <ToastContext.Provider value={{ toast, showConfirm, showPrompt }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm Dialog */}
            <AnimatePresence>
                {confirmState && (
                    <ConfirmDialog
                        options={confirmState.options}
                        onResolve={handleConfirmResolve}
                    />
                )}
            </AnimatePresence>

            {/* Prompt Dialog */}
            <AnimatePresence>
                {promptState && (
                    <PromptDialog
                        options={promptState.options}
                        onResolve={handlePromptResolve}
                    />
                )}
            </AnimatePresence>
        </ToastContext.Provider>
    );
};
