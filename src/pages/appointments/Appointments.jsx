import React, { useEffect, useRef, useState } from 'react';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

// Toast
import { toast } from 'react-toastify';

// Auth Store
import { useAuthStore } from '../../store/auth/authStore';

// API Services
import { fetchAppointments } from '../../modules/appointment/services';

// Components
import AppointmentModal from '../../components/Common/Modals/AppointmentModal';

export default function Appointments() {
    const calendarRef = useRef(null);
    const appointmentModalRef = useRef(null);

    // Auth
    const { user } = useAuthStore();

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

                    // Map variety of colors
                    const SUBTLE_COLORS = [
                        'bg-primary-subtle',
                        'bg-success-subtle',
                        'bg-info-subtle',
                        'bg-warning-subtle',
                        'bg-danger-subtle',
                        'bg-secondary-subtle',
                        'bg-indigo-subtle',
                        'bg-purple-subtle',
                        'bg-teal-subtle'
                    ];

                    let className = 'bg-primary-subtle';
                    if (apt.status === 'cancelled') {
                        className = 'bg-danger-subtle';
                    } else if (apt.status === 'completed') {
                        className = 'bg-success-subtle';
                    } else {
                        // Use meeting_type or ID to pick a consistent "random" color
                        const colorIndex = (apt.id + (apt.meeting_type?.length || 0)) % SUBTLE_COLORS.length;
                        className = SUBTLE_COLORS[colorIndex];
                    }

                    return {
                        id: apt.id,
                        title: apt.subject,
                        start: start,
                        end: end,
                        allDay: false,
                        className: className,
                        classNames: [className],
                        description: apt.description,
                        location: apt.timezone,
                        extendedProps: {
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

    // Update upcoming events list
    useEffect(() => {
        const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
        const future = sorted.filter(e => new Date(e.start) >= new Date());
        setUpcomingEvents(future.slice(0, 10));
    }, [events]);

    // Actions
    const handleNewEvent = (dateStr) => {
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
        // TODO: Call API to update if desired, for now just update local state
        const calEvent = info.event;
        setEvents(prev => prev.map(e => String(e.id) === String(calEvent.id) ? {
            ...e,
            start: calEvent.start,
            end: calEvent.end,
        } : e));
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="row">
                            <div className="col-xl-3">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        <button className="btn btn-primary w-100" id="btn-new-event" onClick={() => handleNewEvent()}><i className="mdi mdi-plus"></i> Create New Appointment</button>
                                        <div id="external-events">{/* External events would go here */}</div>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="mb-1">Upcoming Appointment</h5>
                                    <p className="text-muted">Don't miss scheduled appointments</p>
                                    <div className="pe-2 me-n1 mb-3" data-simplebar style={{ height: "600px" }}>
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

                                                let badge;
                                                if (evt.allDay || !e) {
                                                    badge = <small className="badge bg-primary-subtle text-primary ms-auto">Full day event</small>;
                                                } else {
                                                    const t1 = tConvert(s.toTimeString().slice(0, 5));
                                                    const t2 = tConvert(e.toTimeString().slice(0, 5));
                                                    badge = <small className="badge bg-primary-subtle text-primary ms-auto">{t1} to {t2}</small>;
                                                }
                                                const colorClass = (evt.className || 'bg-primary-subtle').split('-')[1];

                                                return (
                                                    <div className="card mb-3" key={evt.id}>
                                                        <div className="card-body">
                                                            <div className="d-flex mb-3">
                                                                <div className="flex-grow-1">
                                                                    <i className={`mdi mdi-checkbox-blank-circle me-2 text-${colorClass}`}></i>
                                                                    <span className="fw-medium">{dateStr}</span>
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    {badge}
                                                                </div>
                                                            </div>
                                                            <h6 className="card-title fs-16">{evt.title}</h6>
                                                            <p className="text-muted text-truncate-two-lines mb-0">{evt.extendedProps?.description || evt.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-9">
                                <div className="card card-h-100">
                                    <div className="card-body">
                                        {loading ? (
                                            <div style={{ minHeight: '600px' }} className="placeholder-glow">
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
                                                        <div key={row} className="d-flex border-bottom" style={{ height: '100px' }}>
                                                            {[...Array(7)].map((_, col) => (
                                                                <div key={col} className="flex-fill border-end p-1">
                                                                    {((row + col) % 5 === 0) && (
                                                                        <div className="rounded bg-secondary-subtle mt-3 mx-1" style={{ height: '20px', opacity: 0.5 }}></div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div id="calendar" style={{ minHeight: '600px' }}>
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
                                                    editable={true}
                                                    droppable={true}
                                                    selectable={true}
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
