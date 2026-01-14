import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Briefcase, 
  Building2, 
  FileText, 
  Download, 
  Save, 
  Search, 
  Wand2,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Eye,
  Edit2,
  FileDown,
  PenTool,
  ExternalLink,
  Users,
  Clipboard,
  ChevronDown,
  File
} from 'lucide-react';
import { extractJobDetails, optimizeCV, parseResumeFromMedia, parseResumeFromText, generateCoverLetter } from './services/geminiService';
import { AppStatus, ToastMessage } from './types';
import { LoadingOverlay } from './components/LoadingOverlay';

const DEFAULT_CV_PLACEHOLDER = `
# John Doe
**Software Engineer**

## Professional Summary
Experienced software engineer with a passion for building scalable web applications...

## Experience
**Senior Developer | Tech Corp**
*Jan 2020 - Present*
* Led a team of 5 developers...
* Improved system performance by 30%...

## Skills
* JavaScript, TypeScript, React, Node.js
* AWS, Docker, Kubernetes
`;

const DEFAULT_CL_PLACEHOLDER = `
Click "Generate Cover Letter" to draft a tailored letter based on your Resume and the Job Description.
`;

type Tab = 'cv' | 'cl';

export default function App() {
  const [url, setUrl] = useState('');
  const [companyProfile, setCompanyProfile] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  
  const [activeTab, setActiveTab] = useState<Tab>('cv');
  const [cvContent, setCvContent] = useState(DEFAULT_CV_PLACEHOLDER.trim());
  const [clContent, setClContent] = useState(DEFAULT_CL_PLACEHOLDER.trim());
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isEditing, setIsEditing] = useState(true);
  const [showImportMenu, setShowImportMenu] = useState(false);

  // Refs
  const cvSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
        setShowImportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      addToast('error', 'Please enter a valid URL');
      return;
    }

    setStatus(AppStatus.EXTRACTING);
    try {
      const details = await extractJobDetails(url);
      setCompanyProfile(details.companyProfile);
      setJobDescription(details.jobDescription);
      
      const formattedDetails = `Salary Budget: ${details.salaryBudget}

HR Contact: ${details.hrContact}

Email: ${details.contactEmail}

Previous/Current Holder:
${details.previousHolder}

Possible Manager:
${details.possibleManager}

Possible Team Mates:
${details.teamMates}`;
      
      setOtherDetails(formattedDetails);
      addToast('success', 'Job details extracted successfully!');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to extract data');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleOptimize = async () => {
    if (!companyProfile.trim() || !jobDescription.trim()) {
      addToast('error', 'Please extract job details first');
      return;
    }
    if (!cvContent.trim()) {
      addToast('error', 'Please ensure your current CV is in the editor');
      return;
    }

    setStatus(AppStatus.OPTIMIZING);
    try {
      const optimized = await optimizeCV(cvContent, companyProfile, jobDescription);
      setCvContent(optimized);
      setActiveTab('cv');
      setIsEditing(false); 
      addToast('success', 'CV optimized successfully!');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to optimize CV');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!companyProfile.trim() || !jobDescription.trim()) {
      addToast('error', 'Please extract job details first');
      return;
    }
    if (!cvContent.trim()) {
      addToast('error', 'Please ensure your current CV is in the editor');
      return;
    }

    setStatus(AppStatus.GENERATING_COVER_LETTER);
    try {
      const letter = await generateCoverLetter(cvContent, companyProfile, jobDescription);
      setClContent(letter);
      setActiveTab('cl');
      setIsEditing(false); 
      addToast('success', 'Cover Letter generated!');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to generate Cover Letter');
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowImportMenu(false);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      addToast('error', 'Please upload a PDF or Image file.');
      return;
    }

    setStatus(AppStatus.PARSING);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const extractedText = await parseResumeFromMedia(base64Data, file.type);
        setCvContent(extractedText);
        setActiveTab('cv');
        setIsEditing(true); 
        addToast('success', 'CV imported successfully!');
      };
      reader.onerror = () => {
        addToast('error', 'Failed to read file.');
        setStatus(AppStatus.IDLE);
      };
    } catch (error: any) {
      addToast('error', error.message || 'Failed to parse CV file');
      setStatus(AppStatus.IDLE);
    } finally {
      setTimeout(() => setStatus(AppStatus.IDLE), 1000); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteFromGoogleDoc = async () => {
    setShowImportMenu(false);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        addToast('error', 'Clipboard is empty. Copy your CV text first.');
        return;
      }
      
      setStatus(AppStatus.PARSING);
      const extractedText = await parseResumeFromText(text);
      setCvContent(extractedText);
      setActiveTab('cv');
      setIsEditing(true);
      addToast('success', 'Pasted content formatted successfully!');

    } catch (error: any) {
      console.error(error);
      addToast('error', 'Failed to read clipboard. Please allow permissions.');
      setStatus(AppStatus.IDLE);
    } finally {
      setStatus(AppStatus.IDLE);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadPdf = () => {
    setIsEditing(false);
    setTimeout(() => window.print(), 100);
  };

  const handleSaveToDrive = () => {
    const content = activeTab === 'cv' ? cvContent : clContent;
    const filename = activeTab === 'cv' ? "optimized_cv.md" : "cover_letter.md";
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    addToast('success', 'File downloaded as Markdown');
  };

  const handleExportToGoogleDoc = async () => {
    try {
      const plainText = activeTab === 'cv' ? cvContent : clContent;
      if (previewRef.current) {
        const htmlContent = previewRef.current.innerHTML;
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        const data = [new ClipboardItem({ ["text/html"]: blobHtml, ["text/plain"]: blobText })];
        await navigator.clipboard.write(data);
        addToast('success', 'Formatted content copied! Opening Google Docs...');
      } else {
        await navigator.clipboard.writeText(plainText);
        addToast('info', 'Markdown text copied. Opening Google Docs...');
      }
      setTimeout(() => {
        window.open('https://docs.new', '_blank');
      }, 1000);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to copy to clipboard. Please select and copy manually.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-900">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="application/pdf,image/png,image/jpeg,image/webp"
      />

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 no-print">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-in slide-in-from-right ${
              toast.type === 'success' ? 'bg-green-600' : 
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 hover:bg-white/20 rounded p-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Loading Overlay */}
      {(status !== AppStatus.IDLE && status !== AppStatus.SUCCESS && status !== AppStatus.ERROR) && (
        <LoadingOverlay 
          message={
            status === AppStatus.EXTRACTING ? "Analyzing URL and extracting details..." : 
            status === AppStatus.PARSING ? "Reading and formatting your CV..." :
            status === AppStatus.GENERATING_COVER_LETTER ? "Drafting a professional cover letter..." :
            "Tailoring your CV to the job description..."
          } 
          isOptimizing={status === AppStatus.OPTIMIZING}
          isParsing={status === AppStatus.PARSING}
          isWriting={status === AppStatus.GENERATING_COVER_LETTER}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">CV Tailor <span className="text-indigo-600">AI</span></h1>
          </div>
          
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                placeholder="Paste Job Posting URL here (e.g., LinkedIn, Indeed)..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
              <button
                onClick={handleExtract}
                disabled={status !== AppStatus.IDLE}
                className="absolute inset-y-1 right-1 px-4 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Extract
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <a href="https://ai.google.dev/" target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-indigo-600 font-medium">Powered by Gemini</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Job Details */}
        <div className="lg:col-span-4 flex flex-col gap-6 no-print">
          
          {/* Company Profile Box */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[30vh] lg:h-auto lg:aspect-[4/3] overflow-hidden group hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Company Profile</h2>
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/20 text-sm text-gray-600 leading-relaxed"
              placeholder="Extracted company details will appear here..."
              value={companyProfile}
              onChange={(e) => setCompanyProfile(e.target.value)}
            />
          </div>

          {/* Job Description Box */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[30vh] lg:h-auto lg:aspect-[4/3] overflow-hidden group hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Job Description</h2>
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/20 text-sm text-gray-600 leading-relaxed"
              placeholder="Extracted job requirements will appear here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* Other Details Box */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[30vh] lg:h-auto lg:aspect-[4/3] overflow-hidden group hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Other Details</h2>
            </div>
            <textarea
              className="flex-1 w-full p-4 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500/20 text-sm text-gray-600 leading-relaxed"
              placeholder="Salary, HR Contact, Team info, etc..."
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
            />
          </div>

          {/* Mobile Action Buttons */}
          <div className="lg:hidden flex flex-col gap-2">
            <button
              onClick={handleOptimize}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-medium shadow-md active:scale-95 transition-transform"
            >
              <Wand2 className="w-5 h-5" />
              Tailor CV
            </button>
             <button
              onClick={handleGenerateCoverLetter}
              className="w-full flex items-center justify-center gap-2 py-3 bg-pink-600 text-white rounded-lg font-medium shadow-md active:scale-95 transition-transform"
            >
              <PenTool className="w-5 h-5" />
              Write Cover Letter
            </button>
          </div>
        </div>

        {/* Right Column: Editor (CV or Cover Letter) */}
        <div className="lg:col-span-8 flex flex-col h-full" ref={cvSectionRef}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden print-only" id="cv-container">
            
            {/* Top Bar: Tabs & Actions */}
            <div className="bg-white px-4 pt-3 pb-0 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-20 no-print gap-3">
              
              {/* Tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('cv')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative top-[1px] ${
                    activeTab === 'cv' 
                      ? 'bg-white text-indigo-600 border border-gray-200 border-b-white z-10' 
                      : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Resume
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('cl')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative top-[1px] ${
                    activeTab === 'cl' 
                      ? 'bg-white text-pink-600 border border-gray-200 border-b-white z-10' 
                      : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-transparent'
                  }`}
                >
                   <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    Cover Letter
                  </div>
                </button>
              </div>
              
              {/* Toolbar Actions */}
              <div className="flex items-center gap-2 pb-2 sm:pb-0 ml-auto flex-wrap justify-end">
                {/* CV Specific Import Menu */}
                {activeTab === 'cv' && (
                  <div className="relative" ref={importMenuRef}>
                    <button
                      onClick={() => setShowImportMenu(!showImportMenu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-indigo-600 rounded-md text-xs font-medium transition-colors"
                      title="Import CV"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Import</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    {showImportMenu && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="py-1">
                          <button
                            onClick={triggerFileUpload}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="bg-indigo-50 p-1.5 rounded text-indigo-600">
                               <File className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">Upload PDF/Image</div>
                              <div className="text-xs text-gray-500">Best for layout</div>
                            </div>
                          </button>
                          
                          <button
                            onClick={handlePasteFromGoogleDoc}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                          >
                             <div className="bg-blue-50 p-1.5 rounded text-blue-600">
                               <Clipboard className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">Paste from Google Doc</div>
                              <div className="text-xs text-gray-500">Copy doc content & click here</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Action Button */}
                {activeTab === 'cv' ? (
                  <button
                    onClick={handleOptimize}
                    disabled={status !== AppStatus.IDLE}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md text-xs font-medium transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Optimize</span>
                  </button>
                ) : (
                   <button
                    onClick={handleGenerateCoverLetter}
                    disabled={status !== AppStatus.IDLE}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 rounded-md text-xs font-medium transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                )}

                <div className="h-5 w-px bg-gray-300 mx-1"></div>
                
                {/* View/Edit Toggle */}
                 <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`p-1.5 rounded-md transition-colors border ${
                    !isEditing 
                      ? 'bg-gray-800 text-white border-gray-800' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title={isEditing ? "Switch to Preview Mode" : "Switch to Edit Mode"}
                >
                  {isEditing ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </button>

                {/* Export Buttons */}
                <button
                  onClick={handleExportToGoogleDoc}
                  className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                  title="Copy formatted text and open Google Docs"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Download as PDF"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveToDrive}
                  className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Save Markdown"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative bg-white overflow-y-auto min-h-[500px] border-t border-gray-200">
              <textarea
                className={`w-full h-full p-8 md:p-12 resize-none focus:outline-none focus:ring-0 text-gray-800 text-base leading-relaxed font-mono bg-white absolute inset-0 ${!isEditing ? 'hidden' : ''}`}
                value={activeTab === 'cv' ? cvContent : clContent}
                onChange={(e) => activeTab === 'cv' ? setCvContent(e.target.value) : setClContent(e.target.value)}
                placeholder={activeTab === 'cv' ? "Paste your existing CV here or import a file..." : "Your cover letter will appear here..."}
                spellCheck={false}
              />
              <div 
                id="cv-preview"
                className={`w-full h-full p-8 md:p-12 prose prose-sm md:prose-base max-w-none prose-indigo focus:outline-none bg-white overflow-y-auto ${isEditing ? 'hidden' : ''}`}
                ref={previewRef}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeTab === 'cv' ? cvContent : clContent}
                </ReactMarkdown>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-400 text-center no-print flex justify-between">
               <span>{activeTab === 'cv' ? "Resume Mode" : "Cover Letter Mode"}</span>
               <span>Google Docs Export: Auto-copies formatting & opens docs.new</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}