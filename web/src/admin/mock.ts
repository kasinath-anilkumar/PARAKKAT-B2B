/**
 * Mock data for admin sections that don't yet have a backend. Keeps the UI fully
 * interactive (lists, filters, actions) so the panel can be designed and demoed
 * end-to-end; swap each array for a real API query when the endpoint lands.
 */

export interface MockAgent {
  id: string;
  name: string;
  email: string;
  agency: string;
  bookings: number;
  lastLogin: string;
  status: 'Active' | 'Disabled';
}
export const AGENTS: MockAgent[] = [
  { id: 'AG-01', name: 'Rahul Menon', email: 'rahul@holidayplanners.in', agency: 'Holiday Planners', bookings: 142, lastLogin: '2026-07-10 09:12', status: 'Active' },
  { id: 'AG-02', name: 'Priya Nair', email: 'priya@keralatrips.com', agency: 'Kerala Trips', bookings: 98, lastLogin: '2026-07-09 18:40', status: 'Active' },
  { id: 'AG-03', name: 'Arjun Das', email: 'arjun@backwaters.co', agency: 'Backwater Escapes', bookings: 61, lastLogin: '2026-07-08 11:05', status: 'Active' },
  { id: 'AG-04', name: 'Sneha Pillai', email: 'sneha@wanderlust.in', agency: 'Wanderlust Tours', bookings: 37, lastLogin: '2026-06-30 14:22', status: 'Disabled' },
  { id: 'AG-05', name: 'Vikram Rao', email: 'vikram@coastline.in', agency: 'Coastline Holidays', bookings: 203, lastLogin: '2026-07-10 08:01', status: 'Active' },
  { id: 'AG-06', name: 'Fatima Sheikh', email: 'fatima@zenvoyage.in', agency: 'Zen Voyage', bookings: 12, lastLogin: '2026-07-05 16:33', status: 'Active' },
];

export interface MockResort {
  id: string;
  name: string;
  location: string;
  rooms: number;
  amenities: string[];
  status: 'Active' | 'Archived';
  rating: number;
}
export const RESORTS: MockResort[] = [
  { id: 'RS-01', name: 'Backwater Bliss Resort', location: 'Alleppey, Kerala', rooms: 48, amenities: ['Pool', 'Spa', 'Restaurant'], status: 'Active', rating: 4.6 },
  { id: 'RS-02', name: 'Hilltop Haven', location: 'Munnar, Kerala', rooms: 32, amenities: ['Trekking', 'Restaurant'], status: 'Active', rating: 4.4 },
  { id: 'RS-03', name: 'Sands & Palms', location: 'Kovalam, Kerala', rooms: 60, amenities: ['Beach', 'Pool', 'Bar'], status: 'Active', rating: 4.7 },
  { id: 'RS-04', name: 'Forest Whisper Retreat', location: 'Thekkady, Kerala', rooms: 24, amenities: ['Safari', 'Spa'], status: 'Archived', rating: 4.1 },
];

export interface MockRoomType {
  id: string;
  resort: string;
  name: string;
  occupancy: number;
  mealPlan: string;
  baseRate: number;
}
export const ROOM_TYPES: MockRoomType[] = [
  { id: 'RT-01', resort: 'Backwater Bliss Resort', name: 'Deluxe Lake View', occupancy: 2, mealPlan: 'CP (Breakfast)', baseRate: 6500 },
  { id: 'RT-02', resort: 'Backwater Bliss Resort', name: 'Premium Suite', occupancy: 3, mealPlan: 'MAP (Half Board)', baseRate: 9800 },
  { id: 'RT-03', resort: 'Hilltop Haven', name: 'Valley Cottage', occupancy: 2, mealPlan: 'AP (Full Board)', baseRate: 7200 },
  { id: 'RT-04', resort: 'Sands & Palms', name: 'Sea Facing Villa', occupancy: 4, mealPlan: 'CP (Breakfast)', baseRate: 12500 },
];

export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed';
export type PayStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';
export interface MockBooking {
  id: string;
  guest: string;
  resort: string;
  agency: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  status: BookingStatus;
  payment: PayStatus;
}
export const BOOKINGS: MockBooking[] = [
  { id: 'BK-250710-0112', guest: 'S. Krishnan', resort: 'Backwater Bliss Resort', agency: 'Holiday Planners', checkIn: '2026-07-18', checkOut: '2026-07-21', amount: 19500, status: 'Confirmed', payment: 'Paid' },
  { id: 'BK-250710-0111', guest: 'M. Thomas', resort: 'Sands & Palms', agency: 'Coastline Holidays', checkIn: '2026-07-15', checkOut: '2026-07-18', amount: 37500, status: 'Confirmed', payment: 'Paid' },
  { id: 'BK-250709-0108', guest: 'A. Kapoor', resort: 'Hilltop Haven', agency: 'Kerala Trips', checkIn: '2026-07-22', checkOut: '2026-07-24', amount: 14400, status: 'Pending', payment: 'Pending' },
  { id: 'BK-250709-0104', guest: 'R. Iyer', resort: 'Backwater Bliss Resort', agency: 'Wanderlust Tours', checkIn: '2026-07-12', checkOut: '2026-07-14', amount: 13000, status: 'Cancelled', payment: 'Refunded' },
  { id: 'BK-250708-0099', guest: 'N. Gupta', resort: 'Sands & Palms', agency: 'Zen Voyage', checkIn: '2026-07-05', checkOut: '2026-07-08', amount: 41000, status: 'Completed', payment: 'Paid' },
  { id: 'BK-250708-0097', guest: 'P. Varma', resort: 'Hilltop Haven', agency: 'Holiday Planners', checkIn: '2026-07-20', checkOut: '2026-07-23', amount: 21600, status: 'Pending', payment: 'Failed' },
];

export interface MockPayment {
  id: string;
  booking: string;
  agency: string;
  method: string;
  amount: number;
  date: string;
  status: PayStatus;
}
export const PAYMENTS: MockPayment[] = [
  { id: 'PMT-90231', booking: 'BK-250710-0112', agency: 'Holiday Planners', method: 'Airpay · UPI', amount: 19500, date: '2026-07-10', status: 'Paid' },
  { id: 'PMT-90230', booking: 'BK-250710-0111', agency: 'Coastline Holidays', method: 'Airpay · Card', amount: 37500, date: '2026-07-10', status: 'Paid' },
  { id: 'PMT-90228', booking: 'BK-250709-0108', agency: 'Kerala Trips', method: 'Credit', amount: 14400, date: '2026-07-09', status: 'Pending' },
  { id: 'PMT-90224', booking: 'BK-250708-0097', agency: 'Holiday Planners', method: 'Airpay · Netbanking', amount: 21600, date: '2026-07-08', status: 'Failed' },
  { id: 'PMT-90219', booking: 'BK-250709-0104', agency: 'Wanderlust Tours', method: 'Airpay · UPI', amount: 13000, date: '2026-07-09', status: 'Refunded' },
];

export interface MockInvoice {
  id: string;
  agency: string;
  amount: number;
  issued: string;
  due: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}
export const INVOICES: MockInvoice[] = [
  { id: 'INV-2026-0341', agency: 'Holiday Planners', amount: 41100, issued: '2026-07-01', due: '2026-07-15', status: 'Unpaid' },
  { id: 'INV-2026-0340', agency: 'Coastline Holidays', amount: 78500, issued: '2026-07-01', due: '2026-07-15', status: 'Paid' },
  { id: 'INV-2026-0338', agency: 'Kerala Trips', amount: 32400, issued: '2026-06-24', due: '2026-07-08', status: 'Overdue' },
  { id: 'INV-2026-0335', agency: 'Zen Voyage', amount: 41000, issued: '2026-06-20', due: '2026-07-04', status: 'Paid' },
];

export interface MockRefund {
  id: string;
  booking: string;
  agency: string;
  amount: number;
  reason: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Processed';
  date: string;
}
export const REFUNDS: MockRefund[] = [
  { id: 'RF-1204', booking: 'BK-250709-0104', agency: 'Wanderlust Tours', amount: 13000, reason: 'Guest cancellation', status: 'Processed', date: '2026-07-09' },
  { id: 'RF-1203', booking: 'BK-250706-0088', agency: 'Kerala Trips', amount: 6200, reason: 'Partial no-show', status: 'Requested', date: '2026-07-10' },
  { id: 'RF-1201', booking: 'BK-250701-0061', agency: 'Zen Voyage', amount: 9800, reason: 'Overcharge correction', status: 'Approved', date: '2026-07-08' },
];

export interface MockCredit {
  id: string;
  agency: string;
  limit: number;
  used: number;
  status: 'Active' | 'Frozen';
}
export const CREDIT: MockCredit[] = [
  { id: 'CR-01', agency: 'Holiday Planners', limit: 500000, used: 312000, status: 'Active' },
  { id: 'CR-02', agency: 'Coastline Holidays', limit: 800000, used: 145000, status: 'Active' },
  { id: 'CR-03', agency: 'Kerala Trips', limit: 300000, used: 289000, status: 'Active' },
  { id: 'CR-04', agency: 'Wanderlust Tours', limit: 200000, used: 200000, status: 'Frozen' },
];

export interface MockTemplate {
  id: string;
  name: string;
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'In-App';
  updated: string;
}
export const TEMPLATES: MockTemplate[] = [
  { id: 'TPL-01', name: 'Booking Confirmation', channel: 'Email', updated: '2026-06-28' },
  { id: 'TPL-02', name: 'Payment Reminder', channel: 'SMS', updated: '2026-06-20' },
  { id: 'TPL-03', name: 'Credit Limit Alert', channel: 'WhatsApp', updated: '2026-07-02' },
  { id: 'TPL-04', name: 'Promotional Offer', channel: 'Email', updated: '2026-07-05' },
];

export interface MockBroadcast {
  id: string;
  subject: string;
  channel: string;
  audience: string;
  sent: string;
  reach: number;
}
export const BROADCASTS: MockBroadcast[] = [
  { id: 'BC-52', subject: 'Monsoon Special — 20% off', channel: 'Email + WhatsApp', audience: 'All agencies', sent: '2026-07-06', reach: 128 },
  { id: 'BC-51', subject: 'GST invoice format update', channel: 'Email', audience: 'Tier A', sent: '2026-06-30', reach: 24 },
  { id: 'BC-50', subject: 'Scheduled maintenance notice', channel: 'In-App', audience: 'All agencies', sent: '2026-06-25', reach: 132 },
];

export interface MockSync {
  entity: string;
  lastSync: string;
  status: 'Synced' | 'Pending' | 'Failed';
  records: number;
}
export const SYNC_STATUS: MockSync[] = [
  { entity: 'Inventory', lastSync: '2026-07-10 09:30', status: 'Synced', records: 1840 },
  { entity: 'Availability', lastSync: '2026-07-10 09:30', status: 'Synced', records: 1840 },
  { entity: 'Pricing', lastSync: '2026-07-10 09:15', status: 'Failed', records: 0 },
  { entity: 'Booking Status', lastSync: '2026-07-10 09:28', status: 'Pending', records: 312 },
];

export interface MockTxn {
  id: string;
  booking: string;
  gateway: string;
  amount: number;
  status: 'Success' | 'Failed' | 'Refunded';
  time: string;
}
export const AIRPAY_TXNS: MockTxn[] = [
  { id: 'APX-771200', booking: 'BK-250710-0112', gateway: 'UPI', amount: 19500, status: 'Success', time: '2026-07-10 09:11' },
  { id: 'APX-771199', booking: 'BK-250710-0111', gateway: 'Card', amount: 37500, status: 'Success', time: '2026-07-10 08:55' },
  { id: 'APX-771195', booking: 'BK-250708-0097', gateway: 'Netbanking', amount: 21600, status: 'Failed', time: '2026-07-08 17:20' },
  { id: 'APX-771190', booking: 'BK-250709-0104', gateway: 'UPI', amount: 13000, status: 'Refunded', time: '2026-07-09 12:40' },
];

export interface MockSession {
  id: string;
  user: string;
  role: string;
  ip: string;
  device: string;
  started: string;
}
export const SESSIONS: MockSession[] = [
  { id: 'S-1', user: 'admin@parakkatjewels.com', role: 'ADMIN', ip: '103.21.58.12', device: 'Chrome · Windows', started: '2026-07-10 08:00' },
  { id: 'S-2', user: 'rahul@holidayplanners.in', role: 'AGENT', ip: '49.37.220.7', device: 'Safari · iPhone', started: '2026-07-10 09:12' },
  { id: 'S-3', user: 'vikram@coastline.in', role: 'AGENT', ip: '117.98.44.201', device: 'Chrome · Android', started: '2026-07-10 08:01' },
];

export interface MockFailedLogin {
  id: string;
  email: string;
  ip: string;
  attempts: number;
  lastAttempt: string;
}
export const FAILED_LOGINS: MockFailedLogin[] = [
  { id: 'FL-1', email: 'unknown@test.com', ip: '185.220.101.4', attempts: 7, lastAttempt: '2026-07-10 03:22' },
  { id: 'FL-2', email: 'sneha@wanderlust.in', ip: '49.37.11.9', attempts: 3, lastAttempt: '2026-07-09 21:05' },
];

export type TicketStatus = 'Open' | 'Pending' | 'Resolved' | 'Closed';
export interface MockTicket {
  id: string;
  subject: string;
  agency: string;
  priority: 'Low' | 'Medium' | 'High';
  status: TicketStatus;
  updated: string;
}
export const TICKETS: MockTicket[] = [
  { id: 'TK-3391', subject: 'Unable to generate invoice PDF', agency: 'Holiday Planners', priority: 'High', status: 'Open', updated: '2026-07-10 09:40' },
  { id: 'TK-3390', subject: 'Credit limit increase request', agency: 'Kerala Trips', priority: 'Medium', status: 'Pending', updated: '2026-07-10 08:10' },
  { id: 'TK-3388', subject: 'Booking modification not reflecting', agency: 'Coastline Holidays', priority: 'High', status: 'Open', updated: '2026-07-09 19:25' },
  { id: 'TK-3385', subject: 'How to add a sub-agent?', agency: 'Zen Voyage', priority: 'Low', status: 'Resolved', updated: '2026-07-08 15:00' },
];
