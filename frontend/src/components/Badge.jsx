const STATUS_COLORS = {
  // Order statuses
  'Order Received':     'bg-blue-100 text-blue-700',
  'Confirmed':          'bg-indigo-100 text-indigo-700',
  'Under Printing':     'bg-yellow-100 text-yellow-700',
  'Printing Done':      'bg-cyan-100 text-cyan-700',
  'Under Framing':      'bg-orange-100 text-orange-700',
  'Framing Done':       'bg-lime-100 text-lime-700',
  'Under Packaging':    'bg-purple-100 text-purple-700',
  'Packaging Done':     'bg-teal-100 text-teal-700',
  'Ready To Ship':      'bg-emerald-100 text-emerald-700',
  'Order Shipped':      'bg-sky-100 text-sky-700',
  'Order Completed':    'bg-green-100 text-green-700',
  'Cancelled':          'bg-red-100 text-red-700',
  'Cancel by Production': 'bg-rose-100 text-rose-700',
  // Payment
  'Pending':   'bg-amber-100 text-amber-700',
  'Partial':   'bg-orange-100 text-orange-700',
  'Paid':      'bg-green-100 text-green-700',
  'Refunded':  'bg-gray-100 text-gray-600',
  // Generic
  'active':    'bg-green-100 text-green-700',
  'inactive':  'bg-red-100 text-red-600',
  'Disputed':  'bg-red-100 text-red-700',
};

export default function Badge({ label, className = '' }) {
  const color = STATUS_COLORS[label] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      {label}
    </span>
  );
}
