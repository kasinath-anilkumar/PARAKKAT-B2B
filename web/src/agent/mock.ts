/**
 * Agent-scoped mock data (the signed-in agent's own bookings, guests, activity,
 * notifications, tickets). Mirrors the admin/agency mock pattern — swap each
 * array for a real agent-scoped API query when the endpoint lands.
 */

export type BookingCategory = 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending';
export type PayState = 'Paid' | 'Pending' | 'Refunded' | 'Failed';

export interface AgentBooking {
  id: string;
  guest: string;
  resort: string;
  room: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  category: BookingCategory;
  payment: PayState;
}
export const AGENT_BOOKINGS: AgentBooking[] = [
  { id: 'BK-250710-0112', guest: 'S. Krishnan', resort: 'Backwater Bliss Resort', room: 'Deluxe Lake View', checkIn: '2026-07-18', checkOut: '2026-07-21', amount: 19500, category: 'Upcoming', payment: 'Paid' },
  { id: 'BK-250710-0109', guest: 'L. Fernandes', resort: 'Sands & Palms', room: 'Sea Facing Villa', checkIn: '2026-07-19', checkOut: '2026-07-22', amount: 37500, category: 'Upcoming', payment: 'Paid' },
  { id: 'BK-250709-0106', guest: 'A. Kapoor', resort: 'Hilltop Haven', room: 'Valley Cottage', checkIn: '2026-07-22', checkOut: '2026-07-24', amount: 14400, category: 'Pending', payment: 'Pending' },
  { id: 'BK-250708-0099', guest: 'N. Gupta', resort: 'Sands & Palms', room: 'Sea Facing Villa', checkIn: '2026-07-05', checkOut: '2026-07-08', amount: 41000, category: 'Completed', payment: 'Paid' },
  { id: 'BK-250705-0088', guest: 'R. Iyer', resort: 'Backwater Bliss Resort', room: 'Premium Suite', checkIn: '2026-07-01', checkOut: '2026-07-03', amount: 13000, category: 'Completed', payment: 'Paid' },
  { id: 'BK-250704-0081', guest: 'P. Varma', resort: 'Hilltop Haven', room: 'Valley Cottage', checkIn: '2026-07-12', checkOut: '2026-07-14', amount: 21600, category: 'Cancelled', payment: 'Refunded' },
];

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  stays: number;
  lastStay: string;
  frequent: boolean;
}
export const AGENT_GUESTS: Guest[] = [
  { id: 'G-01', name: 'S. Krishnan', phone: '+91 98470 11223', email: 'krishnan@example.com', stays: 5, lastStay: '2026-07-18', frequent: true },
  { id: 'G-02', name: 'L. Fernandes', phone: '+91 90370 44556', email: 'fernandes@example.com', stays: 2, lastStay: '2026-07-19', frequent: false },
  { id: 'G-03', name: 'A. Kapoor', phone: '+91 99000 55221', email: 'kapoor@example.com', stays: 3, lastStay: '2026-07-22', frequent: true },
  { id: 'G-04', name: 'N. Gupta', phone: '+91 90880 33110', email: 'ngupta@example.com', stays: 1, lastStay: '2026-07-05', frequent: false },
];

export type NotifType = 'Booking' | 'Cancellation' | 'Modification' | 'System' | 'Agency';
export interface AgentNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}
export const AGENT_NOTIFICATIONS: AgentNotification[] = [
  { id: 'N-1', type: 'Booking', title: 'Booking confirmed', body: 'BK-250710-0112 at Backwater Bliss Resort is confirmed.', time: '2026-07-10 09:11', read: false },
  { id: 'N-2', type: 'Modification', title: 'Booking modified', body: 'Check-out for BK-250709-0106 changed to 24 Jul.', time: '2026-07-10 08:20', read: false },
  { id: 'N-3', type: 'Agency', title: 'Agency announcement', body: 'Month-end target: 20 confirmed bookings. You are at 14.', time: '2026-07-09 18:00', read: false },
  { id: 'N-4', type: 'Cancellation', title: 'Booking cancelled', body: 'BK-250704-0081 was cancelled; refund processed.', time: '2026-07-09 12:40', read: true },
  { id: 'N-5', type: 'System', title: 'Scheduled maintenance', body: 'Portal maintenance on 14 Jul, 1–2 AM IST.', time: '2026-06-25 09:00', read: true },
];

export interface Activity {
  id: string;
  icon: 'bookings' | 'finance' | 'sync' | 'support';
  text: string;
  time: string;
}
export const AGENT_ACTIVITY: Activity[] = [
  { id: 'AC-1', icon: 'bookings', text: 'Created booking BK-250710-0112 for S. Krishnan', time: '2h ago' },
  { id: 'AC-2', icon: 'finance', text: 'Payment of ₹37,500 received for BK-250710-0109', time: '4h ago' },
  { id: 'AC-3', icon: 'sync', text: 'Modified booking BK-250709-0106 (dates)', time: 'Yesterday' },
  { id: 'AC-4', icon: 'support', text: 'Replied to ticket TK-3390', time: 'Yesterday' },
  { id: 'AC-5', icon: 'bookings', text: 'Cancelled booking BK-250704-0081', time: '2 days ago' },
];

export type TicketState = 'Open' | 'Pending' | 'Resolved' | 'Closed';
export interface AgentTicket {
  id: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High';
  status: TicketState;
  updated: string;
}
export const AGENT_TICKETS: AgentTicket[] = [
  { id: 'TK-3395', subject: 'Voucher not downloading for BK-250710-0112', priority: 'High', status: 'Open', updated: '2026-07-10 09:50' },
  { id: 'TK-3390', subject: 'How do I resend a voucher to a customer?', priority: 'Low', status: 'Resolved', updated: '2026-07-09 16:00' },
];

export interface AgentSession {
  id: string;
  ip: string;
  device: string;
  started: string;
  current: boolean;
}
export const AGENT_SESSIONS: AgentSession[] = [
  { id: 'S-1', ip: '49.37.220.7', device: 'Chrome · Windows', started: '2026-07-10 09:12', current: true },
  { id: 'S-2', ip: '49.37.220.7', device: 'Safari · iPhone', started: '2026-07-09 20:40', current: false },
];

export interface LoginEvent {
  id: string;
  ip: string;
  device: string;
  time: string;
  result: 'Success' | 'Failed';
}
export const AGENT_LOGIN_HISTORY: LoginEvent[] = [
  { id: 'L-1', ip: '49.37.220.7', device: 'Chrome · Windows', time: '2026-07-10 09:12', result: 'Success' },
  { id: 'L-2', ip: '49.37.220.7', device: 'Safari · iPhone', time: '2026-07-09 20:40', result: 'Success' },
  { id: 'L-3', ip: '103.55.12.9', device: 'Chrome · Windows', time: '2026-07-08 08:05', result: 'Failed' },
];

// Last 7 days: booking count + booking value, for the dashboard trend chart.
export const AGENT_WEEK_SERIES = [
  { day: '2026-07-04', bookings: 2, value: 34600 },
  { day: '2026-07-05', bookings: 1, value: 13000 },
  { day: '2026-07-06', bookings: 3, value: 52000 },
  { day: '2026-07-07', bookings: 2, value: 28800 },
  { day: '2026-07-08', bookings: 4, value: 61500 },
  { day: '2026-07-09', bookings: 3, value: 47000 },
  { day: '2026-07-10', bookings: 5, value: 78200 },
];

export const AGENT_FAQS: { q: string; a: string }[] = [
  { q: 'How do I create a booking?', a: 'Go to Search & Book, choose dates and a room, enter guest details, review and confirm. A voucher is generated instantly.' },
  { q: 'Can I modify or cancel a booking?', a: 'Only if your agency has granted you those permissions, and within the resort policy window. Open the booking to see available actions.' },
  { q: 'How do I send a voucher to a customer?', a: 'Open the booking and choose "Send Voucher to Customer" — it emails the PDF to the guest email on file.' },
  { q: 'Why can’t I see reports?', a: 'Report access is controlled by your agency admin. Ask them to enable the Reports permission for your account.' },
];
