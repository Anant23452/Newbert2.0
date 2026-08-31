# Newbert Mentorship System

Mentorship operates entirely inside Newbert. No phone number, WhatsApp, push service, or external notification is used.

## Booking Model

`MentorshipBooking` stores `studentId`, `alumniId`, topic category/details, requested date/time, 30 or 60 minute duration, status, alumni response note, confirmed date/time, and timestamps.

Statuses are `requested`, `accepted`, `rejected`, `reschedule_requested`, `cancelled`, and `completed`.

## Lifecycle

1. A signed-in student requests an alumni profile with `mentorshipEnabled=true`.
2. The backend validates the alumni, available topic, date, duration, and authenticated student identity.
3. The request starts as `requested` and appears under My Mentorship Requests.
4. Only the User linked through `Alumni.userId` can accept, reject, request rescheduling, or complete that alumni's requests.
5. Only the creating student can view or cancel their request.
6. Both dashboards read the persisted status. The frontend refreshes every 15 seconds and also offers manual refresh.

Allowed alumni transitions are requested to accepted/rejected/reschedule, reschedule to accepted/rejected/reschedule, and accepted to completed/reschedule. Terminal requests cannot be reopened.

## Endpoints

- `POST /api/mentorship/requests`
- `GET /api/mentorship/requests/mine`
- `PATCH /api/mentorship/requests/:id/cancel`
- `GET /api/mentorship/requests/received`
- `PATCH /api/mentorship/requests/:id/respond`

Every route requires JWT authentication. Student request responses populate only mentor name, avatar, and college. Alumni responses populate only student name and avatar. Email and phone are never returned.

## Current Limitations

There is no calendar integration, video meeting link, payment, chat, email, or push notification. An alumni must be linked to an authenticated User through `Alumni.userId` to manage received requests.

