import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmationModal({ 
  isOpen, 
  title = 'Confirm Action', 
  message = 'Are you sure?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  isLoading = false,
  isDangerous = false 
}) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-slideUp">
        {/* Title */}
        <h2 className="text-headline-sm font-bold text-on-surface mb-3">{title}</h2>
        
        {/* Message */}
        <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">{message}</p>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-surface-variant text-on-surface-variant rounded-xl font-semibold text-sm hover:bg-surface-variant/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-error text-on-error hover:bg-red-700'
                : 'bg-primary text-on-primary hover:bg-green-700'
            }`}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                {confirmText}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
