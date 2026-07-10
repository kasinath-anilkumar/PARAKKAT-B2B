/**
 * Agency-scoped mock data (the signed-in agency's own agents, bookings, guests,
 * payments, etc.). Mirrors the admin mock pattern — swap each array for a real
 * agency-scoped API query when the endpoint lands.
 */

export interface AgentPermissions {
  booking: boolean;
  cancellation: boolean;
  modification: boolean;
  reports: boolean;
}
export interface AgencyAgent {
  id: string;
  name: string;
  email: string;
  bookings: number;
  revenue: number;
  lastLogin: string;
  status: 'Active' | 'Disabled';
  permissions: AgentPermissions;
}
export const AGENCY_AGENTS: AgencyAgent[] = [
  { id: 'A-01', name: 'Rahul Menon', email: 'rahul@holidayplanners.in', bookings: 142, revenue: 1840000, lastLogin: '2026-07-10 09:12', status: 'Active', permissions: { booking: true, cancellation: true, modification: true, reports: true } },
  { id: 'A-02', name: 'Divya Suresh', email: 'divya@holidayplanners.in', bookings: 88, revenue: 990000, lastLogin: '2026-07-09 17:45', status: 'Active', permissions: { booking: true, cancellation: false, modification: true, reports: false } },
  { id: 'A-03', name: 'Nikhil Roy', email: 'nikhil@holidayplanners.in', bookings: 51, revenue: 610000, lastLogin: '2026-07-08 10:20', status: 'Active', permissions: { booking: true, cancellation: false, modification: false, reports: false } },
  { id: 'A-04', name: 'Meera Jacob', email: 'meera@holidayplanners.in', bookings: 19, revenue: 220000, lastLogin: '2026-06-28 14:02', status: 'Disabled', permissions: { booking: false, cancellation: false, modification: false, reports: false } },
];

export type BookingCategory = 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending';
export type PayState = 'Paid' | 'Pending' | 'Refunded' | 'Failed';
export interface AgencyBooking {
  id: string;
  guest: string;
  resort: string;
  agent: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  category: BookingCategory;
  payment: PayState;
}
export const AGENCY_BOOKINGS: AgencyBooking[] = [
  { id: 'BK-250710-0112', guest: 'S. Krishnan', resort: 'Backwater Bliss Resort', agent: 'Rahul Menon', checkIn: '2026-07-18', checkOut: '2026-07-21', amount: 19500, category: 'Upcoming', payment: 'Paid' },
  { id: 'BK-250709-0108', guest: 'A. Kapoor', resort: 'Hilltop Haven', agent: 'Divya Suresh', checkIn: '2026-07-22', checkOut: '2026-07-24', amount: 14400, category: 'Pending', payment: 'Pending' },
  { id: 'BK-250708-0099', guest: 'N. Gupta', resort: 'Sands & Palms', agent: 'Rahul Menon', checkIn: '2026-07-05', checkOut: '2026-07-08', amount: 41000, category: 'Completed', payment: 'Paid' },
  { id: 'BK-250705-0088', guest: 'R. Iyer', resort: 'Backwater Bliss Resort', agent: 'Nikhil Roy', checkIn: '2026-07-01', checkOut: '2026-07-03', amount: 13000, category: 'Completed', payment: 'Paid' },
  { id: 'BK-250704-0081', guest: 'P. Varma', resort: 'Hilltop Haven', agent: 'Divya Suresh', checkIn: '2026-07-12', checkOut: '2026-07-14', amount: 21600, category: 'Cancelled', payment: 'Refunded' },
  { id: 'BK-250703-0074', guest: 'T. Abraham', resort: 'Sands & Palms', agent: 'Rahul Menon', checkIn: '2026-07-25', checkOut: '2026-07-28', amount: 37500, category: 'Upcoming', payment: 'Paid' },
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
export const GUESTS: Guest[] = [
  { id: 'G-01', name: 'S. Krishnan', phone: '+91 98470 11223', email: 'krishnan@example.com', stays: 6, lastStay: '2026-07-18', frequent: true },
  { id: 'G-02', name: 'A. Kapoor', phone: '+91 99000 55221', email: 'kapoor@example.com', stays: 2, lastStay: '2026-07-22', frequent: false },
  { id: 'G-03', name: 'N. Gupta', phone: '+91 90880 33110', email: 'ngupta@example.com', stays: 9, lastStay: '2026-07-05', frequent: true },
  { id: 'G-04', name: 'R. Iyer', phone: '+91 94470 88990', email: 'iyer@example.com', stays: 1, lastStay: '2026-07-01', frequent: false },
  { id: 'G-05', name: 'T. Abraham', phone: '+91 97460 12345', email: 'abraham@example.com', stays: 4, lastStay: '2026-07-25', frequent: true },
];

export interface AgencyPayment {
  id: string;
  booking: string;
  method: string;
  amount: number;
  date: string;
  status: PayState;
}
export const AGENCY_PAYMENTS: AgencyPayment[] = [
  { id: 'PMT-90231', booking: 'BK-250710-0112', method: 'Airpay · UPI', amount: 19500, date: '2026-07-10', status: 'Paid' },
  { id: 'PMT-90228', booking: 'BK-250709-0108', method: 'Credit', amount: 14400, date: '2026-07-09', status: 'Pending' },
  { id: 'PMT-90220', booking: 'BK-250708-0099', method: 'Airpay · Card', amount: 41000, date: '2026-07-08', status: 'Paid' },
  { id: 'PMT-90214', booking: 'BK-250704-0081', method: 'Airpay · UPI', amount: 21600, date: '2026-07-04', status: 'Refunded' },
];

export const CREDIT_SUMMARY = { limit: 500000, used: 312000, get available() { return this.limit - this.used; }, outstanding: 41100 };

export interface AgencyInvoice {
  id: string;
  amount: number;
  issued: string;
  due: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}
export const AGENCY_INVOICES: AgencyInvoice[] = [
  { id: 'INV-2026-0341', amount: 41100, issued: '2026-07-01', due: '2026-07-15', status: 'Unpaid' },
  { id: 'INV-2026-0332', amount: 68200, issued: '2026-06-01', due: '2026-06-15', status: 'Paid' },
  { id: 'INV-2026-0324', amount: 52700, issued: '2026-05-01', due: '2026-05-15', status: 'Paid' },
];

export type NotifType = 'Booking' | 'Cancellation' | 'Payment' | 'Credit' | 'Promotion' | 'System';
export interface AgencyNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}
export const AGENCY_NOTIFICATIONS: AgencyNotification[] = [
  { id: 'N-1', type: 'Booking', title: 'Booking confirmed', body: 'BK-250710-0112 at Backwater Bliss Resort is confirmed.', time: '2026-07-10 09:11', read: false },
  { id: 'N-2', type: 'Payment', title: 'Payment reminder', body: 'Invoice INV-2026-0341 (₹41,100) is due on 15 Jul.', time: '2026-07-10 08:00', read: false },
  { id: 'N-3', type: 'Credit', title: 'Credit limit alert', body: 'You have used 62% of your ₹5,00,000 credit limit.', time: '2026-07-09 18:30', read: false },
  { id: 'N-4', type: 'Cancellation', title: 'Booking cancelled', body: 'BK-250704-0081 was cancelled; refund processed.', time: '2026-07-09 12:40', read: true },
  { id: 'N-5', type: 'Promotion', title: 'Monsoon Special — 20% off', body: 'Limited-time offer across all Kerala resorts.', time: '2026-07-06 10:00', read: true },
  { id: 'N-6', type: 'System', title: 'Scheduled maintenance', body: 'Portal maintenance on 14 Jul, 1–2 AM IST.', time: '2026-06-25 09:00', read: true },
];

export interface LoginEvent {
  id: string;
  user: string;
  ip: string;
  device: string;
  time: string;
  result: 'Success' | 'Failed';
}
export const LOGIN_HISTORY: LoginEvent[] = [
  { id: 'L-1', user: 'admin@holidayplanners.in', ip: '103.21.58.12', device: 'Chrome · Windows', time: '2026-07-10 08:00', result: 'Success' },
  { id: 'L-2', user: 'rahul@holidayplanners.in', ip: '49.37.220.7', device: 'Safari · iPhone', time: '2026-07-10 09:12', result: 'Success' },
  { id: 'L-3', user: 'divya@holidayplanners.in', ip: '117.98.44.201', device: 'Chrome · Android', time: '2026-07-09 17:45', result: 'Success' },
  { id: 'L-4', user: 'meera@holidayplanners.in', ip: '49.37.11.9', device: 'Chrome · Windows', time: '2026-07-08 21:05', result: 'Failed' },
];

export interface AgencySession {
  id: string;
  user: string;
  ip: string;
  device: string;
  started: string;
  current: boolean;
}
export const AGENCY_SESSIONS: AgencySession[] = [
  { id: 'S-1', user: 'admin@holidayplanners.in', ip: '103.21.58.12', device: 'Chrome · Windows', started: '2026-07-10 08:00', current: true },
  { id: 'S-2', user: 'rahul@holidayplanners.in', ip: '49.37.220.7', device: 'Safari · iPhone', started: '2026-07-10 09:12', current: false },
];

export type TicketState = 'Open' | 'Pending' | 'Resolved' | 'Closed';
export interface AgencyTicket {
  id: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High';
  status: TicketState;
  updated: string;
}
export const AGENCY_TICKETS: AgencyTicket[] = [
  { id: 'TK-3391', subject: 'Unable to generate invoice PDF', priority: 'High', status: 'Open', updated: '2026-07-10 09:40' },
  { id: 'TK-3390', subject: 'Credit limit increase request', priority: 'Medium', status: 'Pending', updated: '2026-07-10 08:10' },
  { id: 'TK-3372', subject: 'Add a new sub-agent', priority: 'Low', status: 'Resolved', updated: '2026-07-05 11:00' },
];

export const FAQS: { q: string; a: string }[] = [
  { q: 'How do I add a new agent?', a: 'Go to Agent Management → Create Agent. The agent receives a temporary password by email and can log in immediately.' },
  { q: 'How is my credit limit set?', a: 'Credit limits are assigned by the portal admin based on your tier and payment history. Request changes via a support ticket.' },
  { q: 'Can I modify a confirmed booking?', a: 'Yes, within the cancellation/modification window defined by the resort policy. Open the booking and choose Modify.' },
  { q: 'When are invoices generated?', a: 'Invoices are generated on the 1st of each month for the previous cycle and emailed to your registered address.' },
  { q: 'How do I download an account statement?', a: 'Payments & Credit → Financial Documents → Download Account Statement.' },
];

export const REVENUE_SERIES = [
  { month: 'Feb', value: 820000 },
  { month: 'Mar', value: 910000 },
  { month: 'Apr', value: 1040000 },
  { month: 'May', value: 980000 },
  { month: 'Jun', value: 1180000 },
  { month: 'Jul', value: 1320000 },
];
