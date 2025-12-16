
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calculator } from 'lucide-react';
import { useTranslation } from '../services/i18n';

interface MathModelModalProps {
  onClose: () => void;
}

export const MathModelModal: React.FC<MathModelModalProps> = ({ onClose }) => {
  const { t } = useTranslation();

  const MetricBlock = ({ title, expl, formula }: { title: string, expl: string, formula: string }) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
         <Calculator className="w-4 h-4 text-blue-500" />
         {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{expl}</p>
      <div className="bg-slate-900 text-slate-50 p-3 rounded-lg font-mono text-xs overflow-x-auto">
        {formula}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             {t('math_title')}
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <X className="w-6 h-6" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
           <MetricBlock 
              title={t('math_cagr')}
              expl={t('math_cagr_expl')}
              formula={t('math_cagr_formula')}
           />
           
           <MetricBlock 
              title={t('math_irr')}
              expl={t('math_irr_expl')}
              formula={t('math_irr_formula')}
           />

           <MetricBlock 
              title={t('math_dd')}
              expl={t('math_dd_expl')}
              formula={t('math_dd_formula')}
           />

           <MetricBlock 
              title={t('math_sharpe')}
              expl={t('math_sharpe_expl')}
              formula={t('math_sharpe_formula')}
           />
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
               {t('done')}
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
