import React from 'react';
import { Loader2, Sparkles, FileSearch, PenTool } from 'lucide-react';

interface LoadingOverlayProps {
  message: string;
  isOptimizing?: boolean;
  isParsing?: boolean;
  isWriting?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, isOptimizing, isParsing, isWriting }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        <div className={`p-4 rounded-full mb-4 ${
          isOptimizing ? 'bg-indigo-100 text-indigo-600' : 
          isParsing ? 'bg-orange-100 text-orange-600' :
          isWriting ? 'bg-pink-100 text-pink-600' :
          'bg-blue-100 text-blue-600'
        }`}>
          {isOptimizing ? (
            <Sparkles className="w-8 h-8 animate-pulse" />
          ) : isParsing ? (
            <FileSearch className="w-8 h-8 animate-pulse" />
          ) : isWriting ? (
            <PenTool className="w-8 h-8 animate-pulse" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin" />
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {isOptimizing ? 'Optimizing Your Resume' : 
           isParsing ? 'Reading Resume' : 
           isWriting ? 'Drafting Cover Letter' :
           'Analyzing Job Post'}
        </h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};