import React, { useState } from 'react';
import { UploadCloud, File, X, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../store/useStore';

export const Upload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setActiveFlowId, language } = useStore();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const langMap: any = { en: 'English', hi: 'Hindi', ta: 'Tamil' };
    formData.append('language', langMap[language] || 'English');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.message || data.detail || data.error || 'Upload failed');
      
      if (data.flow_id) {
        setActiveFlowId(data.flow_id);
        
        // Poll for completion
        const checkStatus = async () => {
          try {
            const statusRes = await fetch(`/api/agents/flow/${data.flow_id}`);
            const statusData = await statusRes.json();
            
            if (statusData.status === 'completed' || statusData.status === 'failed') {
              setIsUploading(false);
              
              // Hydrate global store
              useStore.getState().setPipelineResults({
                runId: data.flow_id,
                // Fetch the actual step outputs from the backend here or let the components do it
                // Actually, the Multi-Agent Flow polls /step/{step_number}
              });
              
              // Let's fetch the actual data for the global store
              try {
                const [opRes, clinRes, resRes, valRes] = await Promise.all([
                  fetch(`/api/agents/flow/${data.flow_id}/step/1`).then(r => r.json()),
                  fetch(`/api/agents/flow/${data.flow_id}/step/2`).then(r => r.json()),
                  fetch(`/api/agents/flow/${data.flow_id}/step/3`).then(r => r.json()),
                  fetch(`/api/agents/flow/${data.flow_id}/step/4`).then(r => r.json())
                ]);
                
                useStore.getState().setPipelineResults({
                  operationalPlan: opRes.output_to_next_agent || opRes,
                  clinicalFindings: clinRes.output_to_next_agent || clinRes,
                  resourcePlan: resRes.output_to_next_agent || resRes,
                  validationResult: valRes.output_to_next_agent || valRes,
                });
              } catch(e) {
                console.error("Failed to hydrate global store", e);
              }
              
              navigate('/agent-flow');
            } else {
              setTimeout(checkStatus, 2000);
            }
          } catch (e) {
            console.error("Error polling status", e);
            setTimeout(checkStatus, 2000);
          }
        };
        
        checkStatus();
      } else {
        navigate('/agent-flow');
      }
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Upload Data</h1>
      
      {error && (
        <div className="bg-[var(--color-status-critical-bg)] border border-[var(--color-status-critical)]/30 text-[var(--color-status-critical)] p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <div 
        onDragOver={e => e.preventDefault()} 
        onDrop={handleDrop}
        className="border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] rounded-2xl p-12 text-center hover:border-[var(--color-accent-blue)] transition-colors cursor-pointer group"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="w-16 h-16 bg-[var(--color-bg-sidebar)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--color-accent-blue)]/10 group-hover:text-[var(--color-accent-blue)] transition-colors">
          <UploadCloud size={32} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-blue)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Upload Infrastructure Baseline & Telemetry</h3>
        
        <button className="px-6 py-2.5 bg-accent-gradient text-white rounded-lg font-medium shadow-md hover:opacity-90 transition-opacity">
          Select Files
        </button>
        <input id="file-input" type="file" multiple accept=".csv" className="hidden" onChange={e => {
          if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }}/>
      </div>

      {files.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Selected Files</h4>
          <div className="space-y-3 mb-8">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--color-bg-sidebar)] border border-[var(--color-border-subtle)] p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <File size={16} className="text-[var(--color-accent-blue)]" />
                  <span className="text-sm font-medium">{f.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">({(f.size/1024).toFixed(1)} KB)</span>
                </div>
                <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-status-critical)]">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSubmit} 
              disabled={isUploading}
              className="px-8 py-3 bg-accent-gradient text-white rounded-lg font-semibold shadow-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
            >
              {isUploading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><CheckCircle size={18} /> Submit Data</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
