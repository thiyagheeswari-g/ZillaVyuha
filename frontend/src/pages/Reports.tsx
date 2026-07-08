import React, { useState } from 'react';
import { FileText, Download, Printer, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Reports = () => {
  const { activeFlowId } = useStore();
  const [reports, setReports] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!activeFlowId) {
      alert("Please upload data and run a flow first.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_id: activeFlowId, question: "" })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.format === 'error') {
        alert(`Error from server: ${data.report}`);
        return;
      }
      
      const newReport = {
        id: `R-${Math.floor(Math.random() * 1000)}`,
        name: `Dynamic Operations Report (${activeFlowId})`,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        requestedBy: 'Current User',
        content: data.report,
        format: data.format || 'txt'
      };
      
      setReports([newReport, ...reports]);
    } catch (e: any) {
      console.error("Failed to fetch or parse response:", e);
      alert(`Failed to generate report: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report: any) => {
    if (report.content && (report.format === 'text' || report.format === 'txt')) {
      try {
        const { exportDistrictReportPDF } = await import('../utils/pdfExport');
        await exportDistrictReportPDF(report);
      } catch (e) {
        console.error("Failed to generate PDF", e);
        alert("Failed to download PDF.");
      }
    } else if (report.content && report.format === 'pdf') {
      try {
        const byteCharacters = atob(report.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to decode PDF", e);
        alert("Failed to download PDF.");
      }
    } else {
      alert("This is a mock report with no content.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <FileText className="text-[var(--color-accent-blue)]" /> Reports
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Generate and download comprehensive operational reports.</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !activeFlowId}
          className="px-4 py-2 bg-accent-gradient text-white font-medium rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} 
          Generate New Report
        </button>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden flex-1">
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Report History</h3>
        </div>
        {reports.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">
            No reports generated yet. Click "Generate New Report" to create one.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg-sidebar)]/50 border-b border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-medium">Report ID</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Generated Date</th>
                <th className="px-6 py-4 font-medium">Requested By</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-[var(--color-bg-sidebar)]/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[var(--color-accent-blue)]">{r.id}</td>
                  <td className="px-6 py-4 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{r.date}</td>
                  <td className="px-6 py-4 text-[var(--color-text-secondary)]">{r.requestedBy}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDownload(r)}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-sidebar)] rounded transition-colors inline-flex"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
