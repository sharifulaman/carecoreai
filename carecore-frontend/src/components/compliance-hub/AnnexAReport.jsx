import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, AlertCircle } from 'lucide-react';

export default function AnnexAReport({ home_id, home_name }) {
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['annex-a-report', home_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateAnnexAReport', { home_id });
      return res.data;
    },
    enabled: !!home_id
  });

  const accommodationCategories = [
    { key: 'self_contained', label: 'Self-contained' },
    { key: 'shared_ring_fenced', label: 'Shared (ring-fenced)' },
    { key: 'shared_non_ring_fenced', label: 'Shared (non-ring-fenced)' }
  ];

  const MetricRow = ({ question, label, data }) => (
    <tr className="border-b hover:bg-slate-50">
      <td className="px-4 py-3 text-sm font-medium">{question}</td>
      <td className="px-4 py-3 text-center text-sm">{data?.self_contained || 0}</td>
      <td className="px-4 py-3 text-center text-sm">{data?.shared_ring_fenced || 0}</td>
      <td className="px-4 py-3 text-center text-sm">{data?.shared_non_ring_fenced || 0}</td>
    </tr>
  );

  const handleExport = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Annex-A-${home_name}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSV = () => {
    const rows = [
      ['Annex A Report', home_name],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Question', 'Self-contained', 'Shared (ring-fenced)', 'Shared (non-ring-fenced)'],
      ['Q5 - Total children', report.data.q5.self_contained, report.data.q5.shared_ring_fenced, report.data.q5.shared_non_ring_fenced],
      ['Q6 - New arrivals', report.data.q6.self_contained, report.data.q6.shared_ring_fenced, report.data.q6.shared_non_ring_fenced],
      ['Q7 - Leavers', report.data.q7.self_contained, report.data.q7.shared_ring_fenced, report.data.q7.shared_non_ring_fenced],
      ['Q9 - Restraint incidents', report.data.q9.self_contained, report.data.q9.shared_ring_fenced, report.data.q9.shared_non_ring_fenced],
      ['Q11 - Missing episodes', report.data.q11.self_contained, report.data.q11.shared_ring_fenced, report.data.q11.shared_non_ring_fenced],
      ['Q12 - Children missing', report.data.q12.self_contained, report.data.q12.shared_ring_fenced, report.data.q12.shared_non_ring_fenced],
      ['Q13 - At risk CSE', report.data.q13.self_contained, report.data.q13.shared_ring_fenced, report.data.q13.shared_non_ring_fenced],
      ['Q14 - Subject to CSE', report.data.q14.self_contained, report.data.q14.shared_ring_fenced, report.data.q14.shared_non_ring_fenced],
      ['Q15 - At risk CCE', report.data.q15.self_contained, report.data.q15.shared_ring_fenced, report.data.q15.shared_non_ring_fenced],
      ['Q16 - Subject to CCE', report.data.q16.self_contained, report.data.q16.shared_ring_fenced, report.data.q16.shared_non_ring_fenced],
      ['Q17 - Total complaints', report.data.q17.self_contained, report.data.q17.shared_ring_fenced, report.data.q17.shared_non_ring_fenced],
      ['Q18 - Child complaints', report.data.q18.self_contained, report.data.q18.shared_ring_fenced, report.data.q18.shared_non_ring_fenced],
      ['Q19 - Other complaints', report.data.q19.self_contained, report.data.q19.shared_ring_fenced, report.data.q19.shared_non_ring_fenced],
      ['Q20 - Children in complaints', report.data.q20.self_contained, report.data.q20.shared_ring_fenced, report.data.q20.shared_non_ring_fenced],
      ['Q21 - UASC/non-English', report.data.q21.self_contained, report.data.q21.shared_ring_fenced, report.data.q21.shared_non_ring_fenced],
      ['Q22 - Allegations vs staff', report.data.q22.self_contained, report.data.q22.shared_ring_fenced, report.data.q22.shared_non_ring_fenced],
      ['Q26 - CP referrals', report.data.q26.self_contained, report.data.q26.shared_ring_fenced, report.data.q26.shared_non_ring_fenced],
      ['Q28 - Radicalisation referrals', report.data.q28.self_contained, report.data.q28.shared_ring_fenced, report.data.q28.shared_non_ring_fenced],
      ['Q30 - Deprivation of liberty', report.data.q30.self_contained, report.data.q30.shared_ring_fenced, report.data.q30.shared_non_ring_fenced],
      ['Q31 - RHI offered', report.data.q31.self_contained, report.data.q31.shared_ring_fenced, report.data.q31.shared_non_ring_fenced],
      ['Q32 - RHI completed', report.data.q32.self_contained, report.data.q32.shared_ring_fenced, report.data.q32.shared_non_ring_fenced]
    ];
    return rows.map(row => row.join(',')).join('\n');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <p className="text-sm text-amber-800">No data available for this home.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{home_name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Period: {new Date(report.period_start).toLocaleDateString()} to {new Date(report.period_end).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} className="gap-2">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Question</th>
              {accommodationCategories.map(cat => (
                <th key={cat.key} className="px-4 py-3 text-center font-semibold">{cat.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MetricRow question="Q5" label="Total children" data={report.data.q5} />
            <MetricRow question="Q6" label="New arrivals (12m)" data={report.data.q6} />
            <MetricRow question="Q7" label="Leavers (12m)" data={report.data.q7} />
            <MetricRow question="Q9" label="Restraint incidents (12m)" data={report.data.q9} />
            <MetricRow question="Q11" label="Missing episodes (12m)" data={report.data.q11} />
            <MetricRow question="Q12" label="Children missing (12m)" data={report.data.q12} />
            <MetricRow question="Q13" label="At risk CSE (current)" data={report.data.q13} />
            <MetricRow question="Q14" label="Subject to CSE (current)" data={report.data.q14} />
            <MetricRow question="Q15" label="At risk CCE (current)" data={report.data.q15} />
            <MetricRow question="Q16" label="Subject to CCE (current)" data={report.data.q16} />
            <MetricRow question="Q17" label="Total complaints (12m)" data={report.data.q17} />
            <MetricRow question="Q18" label="Child complaints (12m)" data={report.data.q18} />
            <MetricRow question="Q19" label="Other complaints (12m)" data={report.data.q19} />
            <MetricRow question="Q20" label="Children in complaints (12m)" data={report.data.q20} />
            <MetricRow question="Q21" label="UASC/non-English (current)" data={report.data.q21} />
            <MetricRow question="Q22" label="Allegations vs staff (12m)" data={report.data.q22} />
            <MetricRow question="Q26" label="CP referrals (12m)" data={report.data.q26} />
            <MetricRow question="Q28" label="Radicalisation referrals (12m)" data={report.data.q28} />
            <MetricRow question="Q30" label="Deprivation of liberty (current)" data={report.data.q30} />
            <MetricRow question="Q31" label="RHI offered (12m)" data={report.data.q31} />
            <MetricRow question="Q32" label="RHI completed (12m)" data={report.data.q32} />
          </tbody>
        </table>
      </div>
    </div>
  );
}