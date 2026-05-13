import React from 'react';
import { IntegrationModel } from '../services/api';

interface AIModelModalProps {
  model: IntegrationModel | null;
  onClose: () => void;
}

export default function AIModelModal({ model, onClose }: AIModelModalProps) {
  if (!model) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e293b] rounded-2xl border border-[#334155] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#334155] bg-[#0f172a]">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{model.name}</h2>
            <p className="text-sm text-[#94a3b8]">by {model.creator}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#94a3b8] hover:text-white hover:bg-[#334155] rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 flex-1 overflow-y-auto">
          {model.hasEmbedded ? (
            <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#334155]">
              <iframe 
                src={model.externalLink} 
                className="w-full h-full"
                title={`Chat with ${model.name}`}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#9333ea] flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Native Integration</h3>
                <p className="text-[#94a3b8] max-w-md mx-auto leading-relaxed">
                  {model.name} does not support embedding directly inside ARCHON. 
                  Click below to open the official application in a new secure tab.
                </p>
              </div>

              <a 
                href={model.externalLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-xl transition-all shadow-lg hover:-translate-y-1"
                onClick={onClose}
              >
                Open {model.name}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
