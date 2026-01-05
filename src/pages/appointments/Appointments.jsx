import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import bootstrap5Plugin from '@fullcalendar/bootstrap5';

// API Services
import { fetchAppointments, updateAppointment } from '../../modules/appointment/services';
import { useAuthStore } from '../../store/auth/authStore';

// Custom Components
import AppointmentModal from '../../components/Common/Modals/AppointmentModal';

// Icon Libraries
import 'remixicon/fonts/remixicon.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Appointments() {
    const calendarRef = useRef(null);
    const modalRef = useRef(null); // Global Modal Ref

    // Auth
    const { user } = useAuthStore();
    const isHost = user?.is_host === 1 || user?.entity_type === 'host' || user?.entity_type === 'Host';

    // Events data
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    // Fetch Appointments
    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            const response = await fetchAppointments();
            if (response.status && response.data) {
                const mappedEvents = response.data.map(apt => {
                    const start = new Date(apt.appointment_date);
                    // Calculate end time based on duration_minutes
                    const end = new Date(start.getTime() + apt.duration_minutes * 60000);

                    // Map variety of colors based on meeting_type for "Accurate Design"
                    const COLOR_MAP = {
                        'Initial Consultation': 'bg-primary-subtle',
                        'Follow-up Meeting': 'bg-info-subtle',
                        'Business Review': 'bg-success-subtle',
                        'Technical Support': 'bg-warning-subtle',
                        'Feedback Session': 'bg-danger-subtle',
                        'Partnership Meeting': 'bg-indigo-subtle',
                        // Keywords mapping for backend flexibility
                        'Marketing': 'bg-success-subtle',
                        'Kickoff': 'bg-secondary-subtle',
                        'Invoice': 'bg-danger-subtle',
                        'Demo': 'bg-info-subtle',
                        'Review': 'bg-warning-subtle',
                        'Offsite': 'bg-dark-subtle'
                    };

                    let className = 'bg-primary-subtle';
                    const type = apt.meeting_type || '';

                    // Match by type or keyword
                    const foundKey = Object.keys(COLOR_MAP).find(key => type.includes(key));
                    if (foundKey) {
                        className = COLOR_MAP[foundKey];
                    } else if (apt.status === 'cancelled') {
                        className = 'bg-danger-subtle';
                    } else if (apt.status === 'completed') {
                        className = 'bg-success-subtle';
                    } else {
                        // Fallback deterministic
                        const SUBTLE_COLORS = ['bg-primary-subtle', 'bg-success-subtle', 'bg-info-subtle', 'bg-warning-subtle', 'bg-danger-subtle'];
                        className = SUBTLE_COLORS[apt.id % SUBTLE_COLORS.length];
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

    // Update upcoming events list
    useEffect(() => {
        // Sort by start date
        const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
        // Filter only future events if needed, but keeping logic consistent with previous requirement
        const future = sorted.filter(e => new Date(e.start) >= new Date());
        setUpcomingEvents(future.slice(0, 10)); // unexpected list size might be huge, limiting to 10
    }, [events]);

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

    const handleNewEvent = (dateStr) => {
        if (modalRef.current) {
            modalRef.current.create(dateStr);
        }
    };

    const handleEventClick = (info) => {
        if (modalRef.current) {
            modalRef.current.show(info.event.id);
        }
    };

    const handleDropResize = async (info) => {
        const calEvent = info.event;
        const payload = {
            subject: calEvent.title,
            appointment_date: calEvent.start.toISOString().replace('T', ' ').slice(0, 19),
            duration_minutes: (calEvent.end - calEvent.start) / 60000,
        };
        try {
            await updateAppointment(calEvent.id, payload);
            toast.success("Appointment updated");
            loadAppointments();
        } catch (error) {
            toast.error("Failed to update appointment");
            info.revert();
        }
    };

    return (
        <React.Fragment>
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
                                                        badge = <small className="badge bg-light text-primary ms-auto" style={{ border: '1px solid #eef1f6' }}>{t1} to {t2}</small>;
                                                    }
                                                    const colorClass = evt.className ? evt.className.replace('bg-', '').replace('-subtle', '') : 'primary';
                                                    const dotColor = evt.className ? `var(--vz-${colorClass})` : '#405189';

                                                    return (
                                                        <div className="card mb-3" key={evt.id}>
                                                            <div className="card-body">
                                                                <div className="d-flex mb-3">
                                                                    <div className="flex-grow-1">
                                                                        <i className={`mdi mdi-checkbox-blank-circle me-2`} style={{ color: dotColor }}></i>
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
                                                    <style>{`
                                                        #calendar .fc-toolbar-title {
                                                            font-weight: 700 !important;
                                                            color: #495057 !important;
                                                            text-transform: uppercase !important;
                                                            font-size: 1.1rem !important;
                                                            letter-spacing: 0.5px;
                                                        }
                                                        
                                                        /* View Buttons (Month, Week, etc.) */
                                                        .fc .fc-button-group > .fc-button {
                                                            background-color: #eef5ff !important;
                                                            border: none !important;
                                                            color: #2979ff !important;
                                                            font-weight: 600 !important;
                                                            padding: 8px 16px !important;
                                                            font-size: 13px !important;
                                                            transition: all 0.2s ease;
                                                            box-shadow: none !important;
                                                            text-transform: capitalize !important;
                                                        }

                                                        .fc .fc-button-group > .fc-button.fc-button-active {
                                                            background-color: #2979ff !important;
                                                            color: #ffffff !important;
                                                            z-index: 1;
                                                        }

                                                        .fc .fc-button-group > .fc-button:hover {
                                                            background-color: #dbeaff !important;
                                                        }

                                                        /* Navigation Buttons (Prev/Next) */
                                                        .fc .fc-prev-button, .fc .fc-next-button {
                                                            background-color: #eef5ff !important;
                                                            border: none !important;
                                                            color: #2979ff !important;
                                                            font-weight: bold !important;
                                                            border-radius: 4px !important;
                                                            margin: 0 2px !important;
                                                            padding: 4px 8px !important;
                                                        }

                                                        /* Today Button */
                                                        #calendar .fc-today-button {
                                                            background-color: #2979ff !important;
                                                            color: #ffffff !important;
                                                            border: none !important;
                                                            font-weight: 600 !important;
                                                            padding: 6px 14px !important;
                                                            border-radius: 4px !important;
                                                            margin-left: 10px !important;
                                                            opacity: 1 !important;
                                                            text-transform: capitalize !important;
                                                        }

                                                        #calendar .fc-today-button:disabled {
                                                            opacity: 0.65 !important;
                                                        }

                                                        /* Event Styling */
                                                        .fc-event {
                                                            border: none !important;
                                                            border-radius: 4px !important;
                                                            padding: 2px 4px !important;
                                                            margin-top: 1px !important;
                                                            cursor: pointer !important;
                                                        }

                                                        .fc-event-title {
                                                            font-weight: 600 !important;
                                                            font-size: 0.8rem !important;
                                                        }

                                                        /* Color themes for events */
                                                        .bg-success-subtle .fc-event-title, .bg-success-subtle .fc-event-time { color: #0ab39c !important; }
                                                        .bg-primary-subtle .fc-event-title, .bg-primary-subtle .fc-event-time { color: #405189 !important; }
                                                        .bg-info-subtle .fc-event-title, .bg-info-subtle .fc-event-time { color: #29b6f6 !important; }
                                                        .bg-warning-subtle .fc-event-title, .bg-warning-subtle .fc-event-time { color: #f7b84b !important; }
                                                        .bg-danger-subtle .fc-event-title, .bg-danger-subtle .fc-event-time { color: #f06548 !important; }
                                                        .bg-secondary-subtle .fc-event-title, .bg-secondary-subtle .fc-event-time { color: #3577f1 !important; }
                                                        .bg-dark-subtle .fc-event-title, .bg-dark-subtle .fc-event-time { color: #212529 !important; }

                                                        .fc-daygrid-event-dot { display: none !important; }
                                                    `}</style>
                                                    <FullCalendar
                                                        ref={calendarRef}
                                                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, bootstrap5Plugin]}
                                                        initialView={window.innerWidth >= 1200 ? "dayGridMonth" : window.innerWidth >= 768 ? "timeGridWeek" : "listMonth"}
                                                        themeSystem="bootstrap5"
                                                        bootstrapFontAwesome={false}
                                                        buttonIcons={{
                                                            prev: 'chevron-left',
                                                            next: 'chevron-right',
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Appointment Modal */}
            <AppointmentModal ref={modalRef} onSuccess={loadAppointments} />
        </React.Fragment>
    );
}
