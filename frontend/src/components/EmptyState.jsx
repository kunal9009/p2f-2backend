import { InboxIcon } from '@heroicons/react/24/outline';

export default function EmptyState({ message = 'No data found', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <InboxIcon className="h-12 w-12 text-gray-300 mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
