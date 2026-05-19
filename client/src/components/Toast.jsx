import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(null);

let externalShow = null;

export function toast(message, type = 'success') {
  if (externalShow) externalShow(message, type);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, message, type }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    externalShow = showToast;
    return () => {
      if (externalShow === showToast) externalShow = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}

function ToastItem({ message, type }) {
  const tone =
    type === 'error'
      ? 'bg-red-600 text-white'
      : type === 'warning'
      ? 'bg-amber-500 text-white'
      : 'bg-green-600 text-white';
  return (
    <div
      className={`px-4 py-2 rounded shadow text-sm ${tone} animate-[toastin_.2s_ease-out]`}
      role="status"
    >
      {message}
      <style>{`@keyframes toastin { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
