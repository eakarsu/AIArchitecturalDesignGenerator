import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-content ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
