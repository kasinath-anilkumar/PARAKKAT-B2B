import { BookingsManager } from '../../shared/BookingsManager';

export function AgentBookingsPage() {
  return (
    <BookingsManager
      title="Booking Management"
      subtitle="Create, view and manage your bookings. Available actions depend on the permissions your agency has granted you."
    />
  );
}
