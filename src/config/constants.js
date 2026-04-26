// ─── USER ROLES ───
const ROLES = {
  ADMIN: 'admin',
  WAREHOUSE: 'warehouse',
  VENDOR: 'vendor',
};

// ─── ORDER STATUS PIPELINE ───
// Vikas's production pipeline (10 stages + 2 cancellation)
const ORDER_STATUS = {
  ORDER_RECEIVED: 'Order Received',
  CONFIRMED: 'Confirmed',
  UNDER_PRINTING: 'Under Printing',
  PRINTING_DONE: 'Printing Done',
  UNDER_FRAMING: 'Under Framing',
  FRAMING_DONE: 'Framing Done',
  UNDER_PACKAGING: 'Under Packaging',
  PACKAGING_DONE: 'Packaging Done',
  READY_TO_SHIP: 'Ready To Ship',
  ORDER_SHIPPED: 'Order Shipped',
  ORDER_COMPLETED: 'Order Completed',
  CANCELLED: 'Cancelled',
  CANCEL_BY_PRODUCTION: 'Cancel by Production',
};

// Valid transitions: which status can move to which
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.ORDER_RECEIVED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.UNDER_PRINTING, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.UNDER_PRINTING]: [ORDER_STATUS.PRINTING_DONE, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.PRINTING_DONE]: [ORDER_STATUS.UNDER_FRAMING, ORDER_STATUS.UNDER_PACKAGING, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.UNDER_FRAMING]: [ORDER_STATUS.FRAMING_DONE, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.FRAMING_DONE]: [ORDER_STATUS.UNDER_PACKAGING, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.UNDER_PACKAGING]: [ORDER_STATUS.PACKAGING_DONE, ORDER_STATUS.CANCEL_BY_PRODUCTION],
  [ORDER_STATUS.PACKAGING_DONE]: [ORDER_STATUS.READY_TO_SHIP],
  [ORDER_STATUS.READY_TO_SHIP]: [ORDER_STATUS.ORDER_SHIPPED],
  [ORDER_STATUS.ORDER_SHIPPED]: [ORDER_STATUS.ORDER_COMPLETED],
  [ORDER_STATUS.ORDER_COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.CANCEL_BY_PRODUCTION]: [],
};

// ─── PAYMENT STATUS ───
const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
};

// ─── SHIPPING STATUS ───
const SHIPPING_STATUS = {
  NOT_SHIPPED: 'Not Shipped',
  READY: 'Ready To Ship',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
};

// ─── PRODUCT TYPES ───
const PRODUCT_TYPES = {
  WALLPAPER: 'Wall Paper',
  PRINT_AND_FRAME: 'Print & Frame',
  WALL_ART: 'Wall Art',
  ART_SET: 'Art Set',
  COLLAGE_SET: 'Collage Set',
};

// P2F sub-types
const P2F_VARIANTS = {
  PHOTO_FRAME: 'Photo Frame',
  FRAME_ONLY: 'Frame Only',
  POSTER: 'Poster',
  ONLY_PRINT: 'Only Print',
  CANVAS: 'Canvas',
};

// ─── PAPER CATEGORIES (finish type) ───
const PAPER_CATEGORIES = ['Matte', 'Satin', 'Glossy', 'Canvas', 'Lustre'];

// ─── QUALITY TIERS ───
const QUALITY_TIERS = ['Standard', 'Premium', 'Exclusive'];

// ─── WALLART PRICING TIERS ───
const WALLART_TIERS = ['Star', 'Platinum', 'Gold', 'Silver'];

// ─── WALLPAPER PRICING TIERS ───
const WALLPAPER_TIERS = ['Standard', 'Premium', 'Exclusive'];

// ─── FRAME STYLES ───
const FRAME_STYLES = ['Classic', 'Modern', 'Rustic', 'Gallery', 'Minimalist'];

// ─── FRAME MATERIALS ───
const FRAME_MATERIALS = ['Wood', 'MDF', 'Metal', 'Composite'];

// ─── GLASS CATEGORIES ───
const GLASS_CATEGORIES = ['Matte', 'Glossy', 'Acrylic Glass', 'Regular Glass', 'Luster'];

// ─── PRICE TYPE (for ProductPricing) ───
const PRICE_TYPES = ['Display', 'MRP', 'Company Margin'];

// ─── SHIPPING PROVIDERS ───
const SHIPPING_PROVIDERS = ['Delhivery', 'BlueDart', 'DTDC', 'Ecom Express', 'Shadowfax'];
const SHIPPING_MODES = ['Express', 'Standard', 'Economy'];

// ─── GST DEFAULTS ───
const GST_DEFAULTS = {
  CGST: 9,
  SGST: 9,
  IGST: 18,
  HSN_PRINTED_MATTER: '4911',
};

// ─── PANEL SECTIONS (per-user UI access) ───
// Canonical list of sidebar/route sections. Each User can have a
// `permissions` array containing some of these IDs to restrict which
// sections they see in the admin panel. Admins always see everything;
// a user whose permissions field is unset (undefined) gets the legacy
// behavior (all non-admin sections), to avoid breaking existing users.
const PANEL_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'kanban',    label: 'Kanban Board' },
  { id: 'tasks',     label: 'All Tasks' },
  { id: 'my-tasks',  label: 'My Tasks' },
  { id: 'search',    label: 'Search' },
  { id: 'team',      label: 'Team' },
  { id: 'reports',   label: 'Reports' },
  { id: 'calendar',  label: 'Calendar' },
  { id: 'ai-chat',   label: 'AI Assistant' },
  { id: 'users',     label: 'Users (admin API)' },
  { id: 'settings',  label: 'Settings' },
];
const PANEL_SECTION_IDS = PANEL_SECTIONS.map(s => s.id);

module.exports = {
  ROLES,
  ORDER_STATUS,
  STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  SHIPPING_STATUS,
  PRODUCT_TYPES,
  P2F_VARIANTS,
  PAPER_CATEGORIES,
  QUALITY_TIERS,
  WALLART_TIERS,
  WALLPAPER_TIERS,
  FRAME_STYLES,
  FRAME_MATERIALS,
  GLASS_CATEGORIES,
  PRICE_TYPES,
  SHIPPING_PROVIDERS,
  SHIPPING_MODES,
  GST_DEFAULTS,
  PANEL_SECTIONS,
  PANEL_SECTION_IDS,
};
