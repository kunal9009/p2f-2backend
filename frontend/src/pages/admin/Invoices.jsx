import { useEffect, useState, useCallback } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { getInvoices, getInvoice } from '../../api/admin';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { PageSpinner } from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import { format } from 'date-fns';

const fmtRs = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback((s = search, p = page) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (s) params.search = s;
    getInvoices(params)
      .then((r) => { setInvoices(r.data.data); setPagination(r.data.pagination); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(search, page); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(search, 1); };

  const openDetail = async (inv) => {
    setDetailModal(true);
    setLoadingDetail(true);
    try {
      const r = await getInvoice(inv._id);
      setSelected(r.data.data);
    } finally { setLoadingDetail(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
        <p className="text-sm text-gray-500">Generate from Order Detail page</p>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search invoice number, customer…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageSpinner /> : invoices.length === 0 ? (
          <EmptyState message="No invoices found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Invoice No.</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Payment</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-900">{inv.customerName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{inv.orderId?.orderId}</td>
                      <td className="px-4 py-3"><Badge label={inv.paymentStatus} /></td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtRs(inv.grandTotal)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(inv.createdAt), 'dd MMM yy')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openDetail(inv)} className="text-blue-600 hover:underline text-xs">
                          <DocumentTextIcon className="h-4 w-4 inline" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} onChange={setPage} />
          </>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title={`Invoice ${selected?.invoiceNumber || '…'}`} size="lg">
        {loadingDetail ? <PageSpinner /> : selected && (
          <div className="space-y-5 text-sm">
            {/* Header */}
            <div className="flex justify-between">
              <div>
                <p className="font-bold text-lg text-gray-900">TAX INVOICE</p>
                <p className="text-gray-500">#{selected.invoiceNumber}</p>
                <p className="text-gray-400">{format(new Date(selected.createdAt), 'dd MMM yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">MahattaART</p>
                {selected.sellerGst && <p className="text-gray-500">GSTIN: {selected.sellerGst}</p>}
              </div>
            </div>

            {/* Billed to */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Billed To</p>
                <p className="font-medium">{selected.customerName}</p>
                {selected.customerGst && <p className="text-gray-500">GSTIN: {selected.customerGst}</p>}
                {selected.billingAddress && (
                  <p className="text-gray-500 text-xs mt-1">
                    {selected.billingAddress.line1}, {selected.billingAddress.city} {selected.billingAddress.pincode}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Shipped To</p>
                {selected.shippingAddress && (
                  <p className="text-gray-500 text-xs">
                    {selected.shippingAddress.line1}, {selected.shippingAddress.city} {selected.shippingAddress.pincode}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">HSN</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Taxable</th>
                  {!selected.isInterState && <th className="px-3 py-2 text-right">CGST</th>}
                  {!selected.isInterState && <th className="px-3 py-2 text-right">SGST</th>}
                  {selected.isInterState && <th className="px-3 py-2 text-right">IGST</th>}
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selected.items?.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-center">{item.hsnCode}</td>
                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{fmtRs(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{fmtRs(item.taxableAmount)}</td>
                    {!selected.isInterState && <td className="px-3 py-2 text-right">{fmtRs(item.cgstAmount)} ({item.cgstRate}%)</td>}
                    {!selected.isInterState && <td className="px-3 py-2 text-right">{fmtRs(item.sgstAmount)} ({item.sgstRate}%)</td>}
                    {selected.isInterState && <td className="px-3 py-2 text-right">{fmtRs(item.igstAmount)} ({item.igstRate}%)</td>}
                    <td className="px-3 py-2 text-right font-medium">{fmtRs(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-60 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtRs(selected.subtotal)}</span></div>
                {selected.totalCgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{fmtRs(selected.totalCgst)}</span></div>}
                {selected.totalSgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{fmtRs(selected.totalSgst)}</span></div>}
                {selected.totalIgst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{fmtRs(selected.totalIgst)}</span></div>}
                {selected.shippingCharge > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{fmtRs(selected.shippingCharge)}</span></div>}
                {selected.discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>-{fmtRs(selected.discount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Grand Total</span><span>{fmtRs(selected.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
