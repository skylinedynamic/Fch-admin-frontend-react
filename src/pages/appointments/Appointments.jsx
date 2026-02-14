import React, { useEffect, useRef, useState } from 'react';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

// Auth Store
import { useAuthStore } from '../../store/auth/authStore';
import { usePermissions } from '../../lib/auth/usePermissions';

// API Services
import { fetchAppointments, updateAppointment } from '../../modules/appointment/services';

// Components
import AppointmentModal from '../../components/Common/Modals/AppointmentModal';

// Custom CSS
import '../../../assets/css/appointments.css';

export default function Appointments() {
    const calendarRef = useRef(null);
    const appointmentModalRef = useRef(null);

    // Auth
    const { user } = useAuthStore();
    const { hasPermission } = usePermissions();

    // Events data
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    // Fetch Appointments
    useEffect(() => {
        loadAppointments();
    }, []);

    // Sync formData description updates back to Summernote if it changes externally (e.g. reset)
    // Be careful not to cause loops. Usually optional if one-way binding is sufficient.


    const loadAppointments = async () => {
        try {
            setLoading(true);
            const response = await fetchAppointments();
            if (response.status && response.data) {
                const mappedEvents = response.data.map(apt => {
                    const start = new Date(apt.appointment_date);
                    // Calculate end time based on duration_minutes
                    const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);

                    // High-fidelity palette classes mapped to 'appointments.css'
                    const PALETTE = [
                        'apt-blue', 'apt-emerald', 'apt-violet', 'apt-sky',
                        'apt-rose', 'apt-amber', 'apt-gray', 'apt-indigo',
                        'apt-teal', 'apt-cyan', 'apt-orange', 'apt-fuchsia'
                    ];

                    let colorClass = PALETTE[0]; // Default
                    if (apt.status === 'cancelled') {
                        colorClass = 'apt-rose';
                    } else if (apt.status === 'completed') {
                        colorClass = 'apt-emerald';
                    } else {
                        // Maximize difference using a prime shift
                        const colorIndex = (parseInt(apt.id) * 11) % PALETTE.length;
                        colorClass = PALETTE[colorIndex];
                    }

                    return {
                        id: apt.id,
                        title: apt.subject,
                        start: start,
                        end: end,
                        allDay: false,
                        className: `fc-custom-event ${colorClass}`,
                        description: apt.description,
                        location: apt.timezone,
                        extendedProps: {
                            colorClass: colorClass,
                            description: apt.description,
                            location: apt.location,
                            timezone: apt.timezone,
                            appointment_code: apt.appointment_code,
                            status: apt.status,
                            meeting_type: apt.meeting_type,
                            assigned_for: apt.assigned_for
                        }
                    };
                });
                setEvents(mappedEvents);
            }
        } catch (error) {
            console.error("Failed to load appointments", error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const str_dt_fmt = (date) => {
        return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };

    const tConvert = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    };

    // Update upcoming events list (From Today or recent past)
    useEffect(() => {
        // Sort by date (descending to show most recent first, or ascending for chronological)
        const sorted = [...events].sort((a, b) => new Date(b.start) - new Date(a.start));
        setUpcomingEvents(sorted.slice(0, 15)); // Show most recent 15
    }, [events]);

    // Actions
    const handleNewEvent = (dateStr) => {
        if (!hasPermission('create appointments')) {
            toast.warn("You do not have permission to create appointments");
            return;
        }
        if (appointmentModalRef.current) {
            appointmentModalRef.current.create(dateStr);
        }
    };

    const handleEventClick = (info) => {
        if (appointmentModalRef.current) {
            appointmentModalRef.current.show(info.event.id);
        }
    };

    const handleDropResize = async (info) => {
        const calEvent = info.event;
        const start = calEvent.start;
        const end = calEvent.end || new Date(start.getTime() + 30 * 60000);
        const duration = (end - start) / 60000;

        const toMySQLDate = (date) => {
            const pad = (num) => (num < 10 ? '0' + num : num);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        const props = calEvent.extendedProps;
        const payload = {
            subject: calEvent.title,
            description: props.description,
            appointment_date: toMySQLDate(start),
            timezone: props.timezone,
            duration_minutes: duration,
            meeting_type: props.meeting_type,
            entity_type: props.assigned_for?.entity_type,
            entity_id: props.assigned_for?.entity_id || props.assigned_for?.id,
            assigned_for: props.assigned_for?.id
        };

        try {
            const response = await updateAppointment(calEvent.id, payload);
            if (response && response.status) {
                toast.success(response.message || 'Appointment updated successfully');
                // Refresh local state to ensure all computed properties (colors, etc) are correct
                setEvents(prev => prev.map(e => String(e.id) === String(calEvent.id) ? {
                    ...e,
                    start: calEvent.start,
                    end: calEvent.end,
                } : e));
            } else {
                toast.error(response?.message || 'Failed to update appointment');
                info.revert();
            }
        } catch (error) {
            console.error("Update failed", error);
            toast.error(error.response?.data?.message || 'Failed to update appointment');
            info.revert();
        }
    };

    return (
        <div className="page-content appointments-page">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="row">
                            <div className="col-lg-4 col-xl-3">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        {hasPermission('create appointments') && (
                                            <button className="btn btn-primary w-100" id="btn-new-event" onClick={() => handleNewEvent()}><i className="mdi mdi-plus"></i> Create New Appointment</button>
                                        )}
                                        <div id="external-events">{/* External events would go here */}</div>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="mb-1">All Appointments</h5>
                                    <p className="text-muted">Don't miss scheduled appointments</p>
                                    <div className="pe-2 me-n1 mb-3 upcoming-event-list-scroll" data-simplebar>
                                        <div id="upcoming-event-list">
                                            {loading && (
                                                <>
                                                    {[1, 2, 3].map(n => (
                                                        <div className="card mb-3" key={n} aria-hidden="true">
                                                            <div className="card-body">
                                                                <div className="d-flex mb-3 placeholder-glow">
                                                                    <div className="flex-grow-1">
                                                                        <span className="placeholder col-4 rounded bg-secondary-subtle"></span>
                                                                    </div>
                                                                    <div className="flex-shrink-0">
                                                                        <span className="placeholder col-3 rounded bg-secondary-subtle"></span>
                                                                    </div>
                                                                </div>
                                                                <h6 className="card-title placeholder-glow">
                                                                    <span className="placeholder col-7 rounded bg-secondary-subtle"></span>
                                                                </h6>
                                                                <p className="text-muted mb-0 placeholder-glow">
                                                                    <span className="placeholder col-12 rounded bg-secondary-subtle"></span>
                                                                    <span className="placeholder col-8 rounded bg-secondary-subtle"></span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {!loading && upcomingEvents.map(evt => {
                                                const s = new Date(evt.start);
                                                const e = evt.end ? new Date(evt.end) : null;

                                                let dateStr = str_dt_fmt(s);
                                                if (e) {
                                                    const eDay = new Date(e);
                                                    if (evt.allDay) {
                                                        eDay.setDate(eDay.getDate() - 1);
                                                    }
                                                    const sStr = str_dt_fmt(s);
                                                    const eStr = str_dt_fmt(eDay);
                                                    if (sStr !== eStr) {
                                                        dateStr = `${sStr} to ${eStr}`;
                                                    }
                                                }

                                                const colorClass = evt.extendedProps?.colorClass || 'apt-blue';

                                                // Determine Status Badge
                                                const status = evt.extendedProps?.status || 'pending';
                                                const isPast = new Date() > s;
                                                let statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                                let statusClass = 'bg-info-subtle text-info';

                                                if (status === 'cancelled') {
                                                    statusClass = 'bg-danger-subtle text-danger';
                                                } else if (status === 'completed') {
                                                    statusClass = 'bg-success-subtle text-success';
                                                } else if (status === 'pending') {
                                                    if (isPast) {
                                                        statusLabel = 'Expired';
                                                        statusClass = 'bg-danger-subtle text-danger';
                                                    } else {
                                                        statusClass = 'bg-warning-subtle text-warning';
                                                    }
                                                }

                                                let badge;
                                                const startTime = s ? tConvert(s.toTimeString().slice(0, 5)) : '';
                                                const endTime = e ? tConvert(e.toTimeString().slice(0, 5)) : '';

                                                if (evt.allDay || !e || !endTime) {
                                                    badge = <small className="badge border-0 py-1 px-2 time-badge-item">Full day</small>;
                                                } else {
                                                    badge = <small className="badge border-0 py-1 px-2 time-badge-item">{startTime} to {endTime}</small>;
                                                }

                                                return (
                                                    <div className={`card mb-3 upcoming-event-card cursor-pointer ${colorClass}`} key={evt.id}
                                                        onClick={() => handleEventClick({ event: { id: evt.id } })}>
                                                        <div className="card-body">
                                                            <div className="d-flex mb-3 align-items-center">
                                                                <div className="flex-grow-1">
                                                                    <i className="mdi mdi-checkbox-blank-circle me-2 event-dot-icon apt-card-icon"></i>
                                                                    <span className="fw-medium text-dark">{dateStr}</span>
                                                                </div>
                                                                <div className="flex-shrink-0 d-flex gap-1">
                                                                    {badge}
                                                                    {statusLabel === 'Expired' && (
                                                                        <span className={`badge ${statusClass}`}>{statusLabel}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <h6 className="card-title fs-16 apt-card-title">{evt.title}</h6>
                                                            <div
                                                                className="text-muted text-truncate-two-lines mb-0 fs-12"
                                                                dangerouslySetInnerHTML={{ __html: evt.extendedProps?.description || evt.description || "" }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-8 col-xl-9">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        {loading ? (
                                            <div className="placeholder-glow skeleton-calendar">
                                                <div className="d-flex justify-content-between mb-4">
                                                    <div className="d-flex gap-1">
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '30px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '30px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                    </div>
                                                    <span className="placeholder rounded bg-secondary-subtle col-3" style={{ height: '35px' }}></span>
                                                    <div className="d-flex gap-1">
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                        <span className="placeholder rounded bg-secondary-subtle" style={{ width: '60px', height: '35px' }}></span>
                                                    </div>
                                                </div>

                                                <div className="border rounded">
                                                    <div className="d-flex border-bottom">
                                                        {[...Array(7)].map((_, i) => (
                                                            <div key={i} className="flex-fill border-end p-2 text-center">
                                                                <span className="placeholder rounded bg-secondary-subtle w-50"></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {[...Array(5)].map((_, row) => (
                                                        <div key={row} className="d-flex border-bottom skeleton-row">
                                                            {[...Array(7)].map((_, col) => (
                                                                <div key={col} className="flex-fill border-end p-1">
                                                                    {((row + col) % 5 === 0) && (
                                                                        <div className="rounded bg-secondary-subtle mt-3 mx-1 skeleton-bar"></div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div id="calendar" className="calendar-wrapper">
                                                <FullCalendar
                                                    ref={calendarRef}
                                                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin]}
                                                    initialView={window.innerWidth >= 1200 ? "dayGridMonth" : window.innerWidth >= 768 ? "timeGridWeek" : "listMonth"}
                                                    themeSystem="bootstrap5"
                                                    bootstrapFontAwesome={{
                                                        prev: 'ri-arrow-left-s-line',
                                                        next: 'ri-arrow-right-s-line',
                                                        today: 'ri-calendar-check-line',
                                                    }}
                                                    headerToolbar={{
                                                        left: 'prev,next today',
                                                        center: 'title',
                                                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
                                                    }}
                                                    buttonText={{
                                                        today: 'Today',
                                                        month: 'Month',
                                                        week: 'Week',
                                                        day: 'Day',
                                                        list: 'List'
                                                    }}
                                                    eventTimeFormat={{
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        meridiem: 'short'
                                                    }}
                                                    events={events}
                                                    editable={hasPermission('update appointments')}
                                                    droppable={hasPermission('update appointments')}
                                                    selectable={hasPermission('create appointments')}
                                                    height={750}
                                                    eventDidMount={(info) => {
                                                        // Styles governed by color classes in appointments.css
                                                    }}
                                                    dateClick={(arg) => handleNewEvent(arg.dateStr)}
                                                    eventClick={handleEventClick}
                                                    eventDrop={handleDropResize}
                                                    eventResize={handleDropResize}

                                                    windowResize={(arg) => {
                                                        if (window.innerWidth >= 1200) {
                                                            arg.view.calendar.changeView('dayGridMonth');
                                                        } else if (window.innerWidth >= 768) {
                                                            arg.view.calendar.changeView('timeGridWeek');
                                                        } else {
                                                            arg.view.calendar.changeView('listMonth');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ clear: 'both' }}></div>
                    </div>
                </div>
                <AppointmentModal ref={appointmentModalRef} onSuccess={loadAppointments} />
            </div>
        </div>
    );
}
