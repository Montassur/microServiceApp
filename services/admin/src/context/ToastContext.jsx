import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info', title = '') => {
        const id = Date.now();
        const toast = { id, message, type, title };

        setToasts(prev => [...prev, toast]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const success = (message, title = 'Success') => showToast(message, 'success', title);
    const error = (message, title = 'Error') => showToast(message, 'error', title);
    const info = (message, title = 'Info') => showToast(message, 'info', title);

    return (
        <ToastContext.Provider value={{ success, error, info }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <div className="toast-icon">
                            {toast.type === 'success' && '✅'}
                            {toast.type === 'error' && '❌'}
                            {toast.type === 'info' && 'ℹ️'}
                        </div>
                        <div className="toast-content">
                            {toast.title && <div className="toast-title">{toast.title}</div>}
                            <div className="toast-message">{toast.message}</div>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};
