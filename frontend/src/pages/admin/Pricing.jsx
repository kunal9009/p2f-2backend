import { useState } from 'react';
import { calculatePricing, calculatePaperCost, calculateSizeGrid } from '../../api/admin';
import toast from 'react-hot-toast';

const fmtRs = (n) => n != null ? `₹${Number(n).toFixed(2)}` : '—';

export default function Pricing() {
  const [tab, setTab] = useState('calculator');

  // Single calculator
  const [calcForm, setCalcForm] = useState({ rate: '', companyMarginPct: 30, mrpPct: 80, displayPct: 60, maxDisplayPct: 75 });
  const [calcResult, setCalcResult] = useState(null);

  // Paper cost
  const [paperForm, setPaperForm] = useState({ rollPrice: '', rollHeightInches: '', rollWidthInches: '', inkCostPerSqIn: '', printCostPerSqIn: '' });
  const [paperResult, setPaperResult] = useState(null);

  // Size grid
  const [gridForm, setGridForm] = useState({ totalCostPerSqIn: '', sizes: '6x8\n8x10\n10x12\n12x16\n12x18\n16x20\n18x24\n24x36', companyMarginPct: 30, mrpPct: 80, displayPct: 60, maxDisplayPct: 75 });
  const [gridResult, setGridResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const runCalc = async () => {
    setLoading(true);
    try {
      const r = await calculatePricing({
        rate: Number(calcForm.rate),
        companyMarginPct: Number(calcForm.companyMarginPct),
        mrpPct: Number(calcForm.mrpPct),
        displayPct: Number(calcForm.displayPct),
        maxDisplayPct: Number(calcForm.maxDisplayPct),
      });
      setCalcResult(r.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const runPaperCost = async () => {
    setLoading(true);
    try {
      const r = await calculatePaperCost({
        rollPrice: Number(paperForm.rollPrice),
        rollHeightInches: Number(paperForm.rollHeightInches),
        rollWidthInches: Number(paperForm.rollWidthInches),
        inkCostPerSqIn: Number(paperForm.inkCostPerSqIn) || 0,
        printCostPerSqIn: Number(paperForm.printCostPerSqIn) || 0,
      });
      setPaperResult(r.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const runGrid = async () => {
    setLoading(true);
    try {
      const sizes = gridForm.sizes.split('\n').map((s) => s.trim()).filter(Boolean);
      const r = await calculateSizeGrid({
        totalCostPerSqIn: Number(gridForm.totalCostPerSqIn),
        sizes,
        markups: {
          companyMarginPct: Number(gridForm.companyMarginPct),
          mrpPct: Number(gridForm.mrpPct),
          displayPct: Number(gridForm.displayPct),
          maxDisplayPct: Number(gridForm.maxDisplayPct),
        },
      });
      setGridResult(r.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = (setter) => (k) => (e) => setter((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="page-title">Pricing Calculator</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'calculator', label: 'Price Calculator' },
          { key: 'paper',      label: 'Paper Roll Cost' },
          { key: 'grid',       label: 'Size Grid' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Rate → Price Tiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="label">Base Rate (₹) *</label><input className="input" type="number" value={calcForm.rate} onChange={(e) => setCalcForm((f) => ({ ...f, rate: e.target.value }))} /></div>
            <div><label className="label">Company Margin %</label><input className="input" type="number" value={calcForm.companyMarginPct} onChange={(e) => setCalcForm((f) => ({ ...f, companyMarginPct: e.target.value }))} /></div>
            <div><label className="label">MRP %</label><input className="input" type="number" value={calcForm.mrpPct} onChange={(e) => setCalcForm((f) => ({ ...f, mrpPct: e.target.value }))} /></div>
            <div><label className="label">Display Price %</label><input className="input" type="number" value={calcForm.displayPct} onChange={(e) => setCalcForm((f) => ({ ...f, displayPct: e.target.value }))} /></div>
            <div><label className="label">Max Display %</label><input className="input" type="number" value={calcForm.maxDisplayPct} onChange={(e) => setCalcForm((f) => ({ ...f, maxDisplayPct: e.target.value }))} /></div>
          </div>
          <button className="btn-primary" onClick={runCalc} disabled={loading || !calcForm.rate}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
          {calcResult && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Base Rate',        value: calcResult.rate },
                { label: 'Company Margin',   value: calcResult.companyMargin },
                { label: 'MRP',              value: calcResult.mrp },
                { label: 'Display Price',    value: calcResult.displayPrice },
                { label: 'Max Display',      value: calcResult.maxDisplayPrice },
              ].map((row) => (
                <div key={row.label} className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-500 font-medium">{row.label}</p>
                  <p className="text-xl font-bold text-blue-900 mt-1">{fmtRs(row.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'paper' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Paper Roll Cost Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'rollPrice',         label: 'Roll Price (₹)' },
              { key: 'rollHeightInches',  label: 'Roll Height (in)' },
              { key: 'rollWidthInches',   label: 'Roll Width (in)' },
              { key: 'inkCostPerSqIn',    label: 'Ink Cost/sq.in' },
              { key: 'printCostPerSqIn',  label: 'Print Cost/sq.in' },
            ].map((field) => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <input className="input" type="number" value={paperForm[field.key]}
                  onChange={(e) => setPaperForm((prev) => ({ ...prev, [field.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={runPaperCost} disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate Cost'}
          </button>
          {paperResult && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Total Sq.in',        value: `${paperResult.totalSqIn?.toFixed(0)} sq.in` },
                { label: 'Paper Cost/sq.in',   value: fmtRs(paperResult.costPerSqIn) },
                { label: 'Ink Cost/sq.in',     value: fmtRs(paperResult.inkCostPerSqIn) },
                { label: 'Print Cost/sq.in',   value: fmtRs(paperResult.printCostPerSqIn) },
                { label: 'Total Cost/sq.in',   value: fmtRs(paperResult.totalCostPerSqIn) },
              ].map((row) => (
                <div key={row.label} className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-amber-600 font-medium">{row.label}</p>
                  <p className="text-lg font-bold text-amber-900 mt-1">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'grid' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing Grid — Multiple Sizes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label">Total Cost/sq.in *</label>
              <input className="input" type="number" value={gridForm.totalCostPerSqIn}
                onChange={(e) => setGridForm((f) => ({ ...f, totalCostPerSqIn: e.target.value }))} />
            </div>
            <div><label className="label">Margin %</label><input className="input" type="number" value={gridForm.companyMarginPct} onChange={(e) => setGridForm((f) => ({ ...f, companyMarginPct: e.target.value }))} /></div>
            <div><label className="label">MRP %</label><input className="input" type="number" value={gridForm.mrpPct} onChange={(e) => setGridForm((f) => ({ ...f, mrpPct: e.target.value }))} /></div>
            <div><label className="label">Display %</label><input className="input" type="number" value={gridForm.displayPct} onChange={(e) => setGridForm((f) => ({ ...f, displayPct: e.target.value }))} /></div>
            <div><label className="label">Max Display %</label><input className="input" type="number" value={gridForm.maxDisplayPct} onChange={(e) => setGridForm((f) => ({ ...f, maxDisplayPct: e.target.value }))} /></div>
            <div className="col-span-2 md:col-span-3">
              <label className="label">Sizes (one per line, e.g. 12x18)</label>
              <textarea className="input font-mono text-xs" rows={6} value={gridForm.sizes}
                onChange={(e) => setGridForm((f) => ({ ...f, sizes: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" onClick={runGrid} disabled={loading || !gridForm.totalCostPerSqIn}>
            {loading ? 'Calculating…' : 'Generate Grid'}
          </button>
          {gridResult && gridResult.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Size</th>
                    <th className="px-3 py-2 text-right">Sq.in</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Margin</th>
                    <th className="px-3 py-2 text-right">MRP</th>
                    <th className="px-3 py-2 text-right">Display</th>
                    <th className="px-3 py-2 text-right">Max Display</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gridResult.map((row) => (
                    <tr key={row.size} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-medium">{row.size}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{row.sqIn}</td>
                      <td className="px-3 py-2 text-right">{fmtRs(row.rate)}</td>
                      <td className="px-3 py-2 text-right text-blue-600 font-medium">{fmtRs(row.companyMargin)}</td>
                      <td className="px-3 py-2 text-right">{fmtRs(row.mrp)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{fmtRs(row.displayPrice)}</td>
                      <td className="px-3 py-2 text-right">{fmtRs(row.maxDisplayPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
