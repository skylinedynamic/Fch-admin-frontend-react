import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Calendar } from 'primereact/calendar';
import { parseDate } from '../../../utils/formatters';

import Modal from 'bootstrap/js/dist/modal';
import $ from 'jquery';
import { toast } from 'react-toastify';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { useQueryClient } from '@tanstack/react-query';

// API Services
import { useCalendlyAvailableTimes, useCalendlyEventTypes, useCalendlyStatus } from '../../../modules/calendly/queries';
import { bookCalendlyAppointment, fetchCalendlyAvailableTimes } from '../../../modules/calendly/services';
import { queryKeys } from '../../../lib/query';
import { fetchAppointmentById, createAppointment, deleteAppointment, updateAppointment, checkAvailability, fetchSelectableUsers } from '../../../modules/appointment/services';
import { availabilityCheckPayload } from '../../../modules/appointment/availability';
import { useAuthStore } from '../../../store/auth/authStore';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useSummernote } from '../../../hooks/useSummernote';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ConfirmationModal from './ConfirmationModal';

// Config
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE_OPTIONS, TIME_SLOTS } from '../../../config';
import { browserTimeZone, defaultStart, endSlotsAfter, endWithinDay, localDateString, minutesBetween, startSlotsFrom, timeAfter, timeZoneLabel } from '../../../utils/appointmentTime';

// Styles
import "../../../../assets/css/appointment-modal.css";
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

// The API fields the form shows a refusal beside; any other shows under the time slot (R2 BUG-024).
const FORM_ERROR_FIELDS = ['subject', 'meeting_type', 'assigned_for', 'appointment_date', 'duration_minutes', 'timezone', 'location', 'location_kind'];

const AppointmentModal = forwardRef(({ onSuccess }, ref) => {
    const eventModalRef = useRef(null);
    const descriptionEditorRef = useRef(null); // This ref will be passed to the useSummernote hook

    const [modalInstance, setModalInstance] = useState(null);
    const [viewMode, setViewMode] = useState(true);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isNewEvent, setIsNewEvent] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    // True while the cancel question is open; closing it without cancelling
    // returns to the details (Bootstrap also reports the close afterwards).
    const askingCancelRef = useRef(false);
    const [formErrors, setFormErrors] = useState({});

    // Under the time slot: the duration's refusal, else one on a field the form has no place for (R2 BUG-024).
    const unshownErrorField = Object.keys(formErrors).find(field => !FORM_ERROR_FIELDS.includes(field));
    const timeSlotError = formErrors.duration_minutes || (unshownErrorField ? [].concat(formErrors[unshownErrorField])[0] : null);

    const currentUser = useAuthStore((state) => state.user);
    const { hasPermission } = usePermissions();
    const isHost = currentUser?.is_host == 1;
    const hostEntityId = currentUser?.entity_id;

    const [assignedForType, setAssignedForType] = useState('');
    const [selectableUsers, setSelectableUsers] = useState([]);
    const [loadingAssignedFor, setLoadingAssignedFor] = useState(false);
    const [isMeetingWithChecked, setIsMeetingWithChecked] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Business Review',
        // Booked in the browser's zone; the API stores UTC (BUG-080).
        location: browserTimeZone(),
        description: '',
        date: '',
        timeStart: '09:00',
        timeEnd: '09:30',
        entity_id: '',
        assigned_for: '',
        entity_type: 'partner',
    });
    // A refused date/time is about the one picked then: a new date or time clears it.
    useEffect(() => {
        setFormErrors(p => (p.appointment_date ? Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'appointment_date')) : p));
    }, [formData.date, formData.timeStart]);
    // "Appointment with is required": answered once someone is chosen.
    useEffect(() => {
        if (formData.assigned_for) {
            setFormErrors(p => (p.assigned_for ? Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'assigned_for')) : p));
        }
    }, [formData.assigned_for]);

    // Display Data
    const [displayData, setDisplayData] = useState({
        title: '',
        date: '',
        timeStart: '',
        timeEnd: '',
        location: '',
        description: '',
        scheduledById: '',
        scheduledBy: '',
        assignedFor: '',
        appointmentCode: '',
        category: '',
        assignedForUserId: '',
        status: '',
        isPast: false,
    });

    // The two people on a meeting may change it (BUG-102): whoever booked it
    // edits or deletes it; whoever it was booked with reschedules, confirms or
    // cancels it.
    const canUpdate = hasPermission('update appointments');
    const isScheduler = currentUser?.id == displayData.scheduledById;
    // A new appointment has no invitee yet: the last one opened (still in displayData) must not
    // hide "Appointment With" - that left Create New with no one to pick and Calendly locked.
    const isInvitee = !isNewEvent && !isScheduler && !!displayData.assignedForUserId && currentUser?.id == displayData.assignedForUserId;
    const isOpenStatus = displayData.status === APPOINTMENT_STATUS.PENDING || displayData.status === APPOINTMENT_STATUS.CONFIRMED;
    const canConfirm = isInvitee && canUpdate && !displayData.isPast && displayData.status === APPOINTMENT_STATUS.PENDING;
    const canCancel = isInvitee && canUpdate && !displayData.isPast && isOpenStatus;

    const [originalData, setOriginalData] = useState(null);

    // Sync with Calendly: a new appointment, when the partner's Calendly is
    // connected, is also booked there - at the date and time picked here, in
    // the Calendly account's active event type (picked by FCH, never asked).
    const queryClient = useQueryClient();
    const { data: calendlyStatus } = useCalendlyStatus();
    // Your own Calendly (your partner's, or a borrower's own), when connected.
    const canBookInCalendly = isNewEvent && Boolean(calendlyStatus?.connected && calendlyStatus?.can_book);
    const [bookInCalendly, setBookInCalendly] = useState(false);
    // The appointment being edited is a Calendly meeting: its new title or time changes it in Calendly too.
    const [editingCalendlyMeeting, setEditingCalendlyMeeting] = useState(false);
    const inCalendly = canBookInCalendly && bookInCalendly && !viewMode;
    // Calendly applies to this form: a new meeting booked there, or a Calendly meeting being
    // edited (its new title or time is changed there) - both get the live Calendly checks.
    const calendlySynced = inCalendly || (!isNewEvent && editingCalendlyMeeting && !viewMode);
    // Which of the event type's places (Zoom, phone call, in person, ...), and where -
    // for a phone call the number to call - when that place asks the invitee.
    const [calendlyLocationKind, setCalendlyLocationKind] = useState('');
    const [calendlyLocation, setCalendlyLocation] = useState('');
    const { data: calendlyEventTypes = [], isLoading: loadingEventTypes } = useCalendlyEventTypes(calendlySynced);
    // The Calendly account's active event type - it sets the meeting's length and place.
    const calendlyEventType = calendlyEventTypes[0];
    const calendlyMinutes = calendlyEventType?.duration || 30;
    const calendlyLocationOptions = calendlyEventType?.location_options || [];
    const calendlyLocationChoice = calendlyLocationOptions.find(option => option.kind === calendlyLocationKind) || calendlyLocationOptions[0];
    const calendlyLocationKindInUse = calendlyLocationChoice?.kind || calendlyEventType?.location_kind;
    const calendlyAsksInvitee = calendlyLocationChoice ? Boolean(calendlyLocationChoice.asks_invitee) : Boolean(calendlyEventType?.asks_invitee_location);
    // A phone call to the invitee uses their number from FCH; it is asked for only
    // when the API says FCH has none (or it is not a phone number).
    const [askCalendlyPhone, setAskCalendlyPhone] = useState(false);
    const calendlyAsksLocation = calendlyAsksInvitee && (calendlyLocationKindInUse !== 'outbound_call' || askCalendlyPhone);
    const calendlyLocationLabel = calendlyLocationKindInUse === 'outbound_call' ? 'Phone number to call' : 'Where to meet';
    // The person invited: always picked.
    const calendlyAttendee = formData.assigned_for;
    // A place belongs to its event type.
    useEffect(() => setCalendlyLocationKind(''), [calendlyEventType?.uri]);
    // Someone else may have a number in FCH: ask again only if the API says so.
    useEffect(() => setAskCalendlyPhone(false), [calendlyAttendee]);

    // Live overlap check while synced: Calendly's open times that day (already
    // without the person's FCH meetings) - the picked start must be one of them.
    // Checked only once the person is chosen ("Appointment With"): their FCH meetings count too.
    const calendlyTimesPayload = calendlySynced && calendlyEventType && formData.date && calendlyAttendee
        ? {
            event_type_uri: calendlyEventType.uri,
            date: formData.date,
            timezone: formData.location,
            ...(calendlyAttendee ? { assigned_for: Number(calendlyAttendee) } : {}),
            // Editing: the meeting's own time does not count as taken in FCH.
            ...(!isNewEvent && selectedEventId ? { except_appointment_id: Number(selectedEventId) } : {}),
        }
        : null;
    const {
        data: calendlyOpenTimes = [],
        isFetching: checkingCalendly,
        error: calendlyTimesError,
    } = useCalendlyAvailableTimes(calendlyTimesPayload);
    const calendlyPickedLocal = formData.date && formData.timeStart ? `${formData.date} ${formData.timeStart}:00` : '';
    const calendlyChecked = Boolean(calendlyTimesPayload) && !checkingCalendly && !calendlyTimesError;
    // An edited meeting kept at its own time is not an overlap (Calendly lists it as taken - by itself).
    const keepsOwnTime = !isNewEvent && originalData?.date === formData.date && originalData?.timeStart === formData.timeStart;
    const calendlyOverlap = calendlyChecked && Boolean(calendlyPickedLocal) && !keepsOwnTime
        && !calendlyOpenTimes.some(slot => slot.local_time === calendlyPickedLocal);
    const calendlyCheckError = calendlyTimesError
        ? calendlyTimesError?.response?.data?.message || 'Calendly availability could not be checked'
        : '';
    // Calendly's hours that day (first open start to the last one's end), to say *why* a time overlaps:
    // inside them it is already booked (in Calendly or FCH); outside them Calendly is closed.
    const calendlyHours = calendlyOpenTimes.length
        ? {
            from: calendlyOpenTimes[0].local_time.slice(11, 16),
            to: timeAfter(calendlyOpenTimes[calendlyOpenTimes.length - 1].local_time.slice(11, 16), calendlyMinutes),
        }
        : null;
    const calendlyOverlapBooked = Boolean(calendlyOverlap && calendlyHours && formData.timeStart
        && formData.timeStart >= calendlyHours.from && formData.timeStart < calendlyHours.to);
    // No open time that day: the next day (within a week) that has some, to pick from instead.
    const [calendlyNextOpen, setCalendlyNextOpen] = useState(null);
    const [findingNextOpen, setFindingNextOpen] = useState(false);
    // Still looking for the next open day (the day picked has none): one loading state
    // until the answer is complete - not a result box with a second spinner inside.
    const searchingNextOpen = calendlyOpenTimes.length === 0 && findingNextOpen && !calendlyNextOpen;
    useEffect(() => {
        setCalendlyNextOpen(null);
        setFindingNextOpen(false);
        if (!calendlyChecked || calendlyOpenTimes.length > 0 || !calendlyTimesPayload) return;
        let active = true;
        setFindingNextOpen(true);
        (async () => {
            const [y, m, d] = formData.date.split('-').map(Number);
            for (let i = 1; i <= 7 && active; i++) {
                const next = new Date(y, m - 1, d + i);
                const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
                try {
                    const slots = await fetchCalendlyAvailableTimes({ ...calendlyTimesPayload, date });
                    if (active && slots.length) {
                        setCalendlyNextOpen({ date, slots });
                        setFindingNextOpen(false);
                        return;
                    }
                } catch {
                    break;
                }
            }
            if (active) setFindingNextOpen(false);
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendlyChecked, calendlyOpenTimes.length, formData.date, calendlyEventType?.uri, calendlyAttendee, formData.location]);
    // Picks an open Calendly time (on that day): start, and the end Calendly books.
    const pickCalendlyTime = (date, slot) => {
        const value = slot.local_time.slice(11, 16);
        setFormData(p => ({ ...p, date, timeStart: value, timeEnd: timeAfter(value, calendlyMinutes) }));
    };
    const timeLabel = (value) => TIME_SLOTS.find(slot => slot.value === value)?.label || tConvert(value);
    // Calendly sets the meeting's length (its event type's): the end follows the start.
    useEffect(() => {
        if (calendlySynced && formData.timeStart) {
            setFormData(p => ({ ...p, timeEnd: timeAfter(p.timeStart, calendlyMinutes) }));
        }
    }, [calendlySynced, formData.timeStart, calendlyMinutes]);

    // Start times still ahead on the chosen day (BUG-078); an appointment being
    // edited keeps its own time in the list.
    const openStarts = startSlotsFrom(TIME_SLOTS, formData.date);
    const ownStart = !isNewEvent && originalData?.date === formData.date ? originalData?.timeStart : null;
    const startOptions = ownStart && !openStarts.some(slot => slot.value === ownStart)
        ? TIME_SLOTS.filter(slot => slot.value === ownStart || openStarts.includes(slot))
        : openStarts;

    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [showDateSkeleton, setShowDateSkeleton] = useState(false);
    const [availabilityConflicts, setAvailabilityConflicts] = useState(null);
    const [lastConflictingAttempt, setLastConflictingAttempt] = useState(null);
    const [conflictError, setConflictError] = useState(null);
    const [isConflictVisible, setIsConflictVisible] = useState(false);
    const conflictTimeoutRef = useRef(null);
    const isSystemShiftRef = useRef(false);
    const prevDateRef = useRef(formData.date);
    const prevTimeStartRef = useRef(formData.timeStart);
    const prevTimeEndRef = useRef(formData.timeEnd);

    // Initialize Modal
    useEffect(() => {
        if (eventModalRef.current && !modalInstance) {
            const mod = new Modal(eventModalRef.current, { keyboard: false });
            setModalInstance(mod);
        }
    }, []);

    // Check Availability
    useEffect(() => {
        const check = async () => {
            // Calendly's open times already leave out both people's FCH meetings.
            if (!formData.date || !(formData.assigned_for || formData.entity_id) || viewMode) {
                setAvailabilityConflicts(null);
                setConflictError(null);
                return;
            }

            try {
                // User Request: Only show skeleton when time slot changes
                const timeChanged = prevTimeStartRef.current !== formData.timeStart ||
                    prevTimeEndRef.current !== formData.timeEnd;
                const isFirstCheck = !prevDateRef.current;

                if (timeChanged && !isFirstCheck) {
                    setIsCheckingAvailability(true);
                }

                setAvailabilityConflicts(null);
                // The attendee by user id, as Save sends it - not the record id (R2 BUG-073).
                const response = await checkAvailability(availabilityCheckPayload({
                    date: formData.date,
                    timeStart: formData.timeStart,
                    assignedFor: formData.assigned_for,
                    entityType: formData.entity_type,
                    entityId: formData.entity_id,
                    appointmentId: isNewEvent ? undefined : selectedEventId
                }));

                if (response.data && response.data.available === false) {
                    setAvailabilityConflicts(response.data);

                    const allConflicts = [
                        ...(response.data.assignee_conflicts || []),
                        ...(response.data.scheduler_conflicts || [])
                    ];

                    const matchingConflict = allConflicts.find(c => {
                        const cStart = c.start_time || "";
                        const cEnd = c.end_time || "";
                        // Standard overlap check: (StartA < EndB) && (EndA > StartB)
                        // AND exclude the CURRENT appointment itself by ID
                        const isSelf = !isNewEvent && String(c.id) === String(selectedEventId);
                        return (formData.timeStart < cEnd && endWithinDay(formData.timeStart, formData.timeEnd) > cStart) && !isSelf;
                    });

                    // Logic: If we are EDITING and the user has NOT changed the time/date, ignore conflicts (it's likely the current appointment)
                    const hasChanged = isNewEvent ||
                        formData.date !== originalData?.date ||
                        formData.timeStart !== originalData?.timeStart ||
                        formData.timeEnd !== originalData?.timeEnd;

                    if (matchingConflict) {
                        setLastConflictingAttempt({
                            attemptedStart: formData.timeStart,
                            attemptedEnd: formData.timeEnd,
                            conflict: matchingConflict
                        });
                        setIsConflictVisible(true);
                    } else {
                        setIsConflictVisible(false);
                        setLastConflictingAttempt(null);
                    }
                } else {
                    setAvailabilityConflicts(null);
                    setLastConflictingAttempt(null);
                    setIsConflictVisible(false);
                }
            } catch (error) {
                console.error("Failed to check availability", error);
            } finally {
                setIsCheckingAvailability(false);
                isSystemShiftRef.current = false;
                // Update refs after check
                prevDateRef.current = formData.date;
                prevTimeStartRef.current = formData.timeStart;
                prevTimeEndRef.current = formData.timeEnd;
            }
        };

        const timeoutId = setTimeout(() => {
            if (!viewMode) check();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.date, formData.timeStart, formData.timeEnd, formData.assigned_for, formData.entity_id, formData.entity_type, viewMode, originalData, inCalendly]);

    // Helper functions (tConvert, formatDate, etc.) should be here or imported
    const tConvert = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    };

    const formatDate = (dateObj) => {
        const d = new Date(dateObj);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
    };

    const getShortType = (fullType) => {
        if (!fullType) return 'partners';
        const segments = fullType.split('\\\\');
        const last = segments[segments.length - 1].toLowerCase();
        if (last === 'employee') return 'employee-details';
        if (last === 'partner') return 'partners';
        if (last === 'borrower') return 'clients';
        return last + 's';
    };

    const isSlotBlocked = (timeValue, isEnd = false) => {
        if (!availabilityConflicts) return false;
        const allConflicts = [
            ...(availabilityConflicts.assignee_conflicts || []),
            ...(availabilityConflicts.scheduler_conflicts || [])
        ];
        return allConflicts.some(c => {
            const cStart = (c.start_time || "").substring(0, 5);
            const cEnd = (c.end_time || "").substring(0, 5);
            if (isEnd) {
                // Block if this end time is inside a conflict
                if (timeValue > cStart && timeValue <= cEnd) return true;
                // Block if this end time "jumps over" the conflict 
                // (i.e. starts after the conflict but our selected start is before it)
                if (formData.timeStart < cStart && timeValue > cStart) return true;
                return false;
            } else {
                // Start time cannot be inside a conflict
                return timeValue >= cStart && timeValue < cEnd;
            }
        });
    };

    // Load Options
    const loadSelectableUsers = async () => {
        try {
            setLoadingAssignedFor(true);
            const payload = {
                [isHost ? 'meeting_with' : 'meeting_with_host']: isMeetingWithChecked ? 1 : 0
            };
            const response = await fetchSelectableUsers(payload);
            if (response.status) {
                setSelectableUsers(response.data || []);
            }
        } catch (error) {
            console.error("Failed to load selectable users", error);
        } finally {
            setLoadingAssignedFor(false);
        }
    };

    useEffect(() => {
        if (!viewMode) {
            loadSelectableUsers();
        }
    }, [viewMode, isMeetingWithChecked]);

    // Exposure
    useImperativeHandle(ref, () => ({
        show: async (id) => {
            setIsNewEvent(false);
            setViewMode(true);
            setIsDescriptionExpanded(false);
            setSelectedEventId(id);
            setFormErrors({});
            setAvailabilityConflicts(null);
            if (modalInstance) modalInstance.show();
            await fetchDetails(id);
        },
        create: (dateStr) => {
            setIsNewEvent(true);
            setViewMode(false);
            setSelectedEventId(null);
            setAssignedForType('');
            setAvailabilityConflicts(null);
            setIsConflictVisible(false);
            setLastConflictingAttempt(null);
            setConflictError(null);
            setIsMeetingWithChecked(false);
            setBookInCalendly(false);
            setEditingCalendlyMeeting(false);
            setCalendlyLocation('');
            setAskCalendlyPhone(false);
            // The browser's own day, at 09:00 or the next time still ahead (BUG-078).
            const start = defaultStart(TIME_SLOTS, dateStr || localDateString());
            setFormData({
                subject: '',
                category: 'Business Review',
                location: browserTimeZone(),
                description: '',
                date: start.date,
                timeStart: start.time,
                timeEnd: timeAfter(start.time),
                entity_id: '',
                assigned_for: '',
                entity_type: '',
            });
            setFormErrors({});



            if (modalInstance) modalInstance.show();
        }
    }));

    const fetchDetails = async (id) => {
        try {
            setLoadingDetails(true);
            const apt = await fetchAppointmentById(id);
            setEditingCalendlyMeeting(Boolean(apt.is_calendly));
            const dateStr = apt.appointment_date ? apt.appointment_date.replace(' ', 'T') : '';
            const start = dateStr ? new Date(dateStr) : new Date();
            const duration = apt.duration_minutes || 30;
            const end = new Date(start.getTime() + duration * 60000);

            setDisplayData({
                title: apt.subject,
                date: formatDate(start),
                timeStart: tConvert(start.toTimeString().slice(0, 5)),
                timeEnd: tConvert(end.toTimeString().slice(0, 5)),
                // The API sends the time in this browser's zone.
                location: timeZoneLabel(browserTimeZone()),
                description: apt.description || "No Description",
                scheduledById: apt.scheduled_by?.id,
                scheduledBy: apt.scheduled_by?.name || "FCH Admin",
                assignedFor: apt.assigned_for?.name || "N/A",
                assignedForId: apt.assigned_for?.entity_id || apt.assigned_for?.id,
                assignedForType: apt.assigned_for?.entity_type || null,
                assignedForAvatar: apt.assigned_for?.image || apt.assigned_for?.avatar || apt.assigned_for?.profile_picture || null,
                appointmentCode: apt.appointment_code || '',
                category: apt.meeting_type || 'Business Review',
                assignedForUserId: apt.assigned_for?.id,
                status: apt.status || '',
                isPast: start < new Date(),
            });

            const h_full = start.getHours().toString().padStart(2, '0');
            const m_full = start.getMinutes().toString().padStart(2, '0');
            const hh_mm_full = `${h_full}:${m_full}`;

            const h_end_full = end.getHours().toString().padStart(2, '0');
            const m_end_full = end.getMinutes().toString().padStart(2, '0');
            const hh_mm_end_full = `${h_end_full}:${m_end_full}`;

            // Set Form Data for Editing
            setFormData({
                subject: apt.subject,
                category: apt.meeting_type || 'Business Review',
                location: browserTimeZone(),
                description: apt.description || "",
                date: localDateString(start),
                timeStart: hh_mm_full,
                timeEnd: hh_mm_end_full,
                entity_id: '',
                assigned_for: '',
                entity_type: ''
            });

            // The checkbox follows who the meeting is with. Ticked, the
            // picker lists partner accounts: other partners for the host
            // ("Meeting with partner"), the host for a partner ("Meeting with
            // host"); unticked, the caller's own team and clients. A partner's
            // meeting with its client was ticked, so the picker held the
            // host's users and showed no attendee (BUG-100).
            const attendeeType = apt.assigned_for?.entity_type?.toLowerCase();
            const meetingWithValue = attendeeType
                ? attendeeType === 'partner'
                : apt.meeting_with === 1 || apt.meeting_with_host === 1;
            setIsMeetingWithChecked(meetingWithValue);

            // Load selectable users with the correct meeting_with state
            if (apt.assigned_for) {
                try {
                    setLoadingAssignedFor(true);
                    const payload = {
                        [isHost ? 'meeting_with' : 'meeting_with_host']: meetingWithValue ? 1 : 0
                    };
                    const response = await fetchSelectableUsers(payload);
                    if (response.status) {
                        setSelectableUsers(response.data || []);
                    }

                    // NOW set the assigned_for data after users are loaded
                    const rawType = apt.assigned_for.entity_type || '';
                    const formattedType = rawType.toLowerCase();
                    setAssignedForType(formattedType);

                    console.log('[AppointmentModal] Setting assigned_for:', {
                        entity_id: apt.assigned_for.entity_id || apt.assigned_for.id,
                        assigned_for: apt.assigned_for.id,
                        entity_type: formattedType,
                        raw_assigned_for: apt.assigned_for,
                        loaded_users: response.data
                    });

                    setFormData(p => ({
                        ...p,
                        entity_id: apt.assigned_for.entity_id || apt.assigned_for.id,
                        assigned_for: apt.assigned_for.id,
                        entity_type: formattedType
                    }));

                    // Set Original Data for Comparison
                    setOriginalData({
                        subject: apt.subject,
                        category: apt.meeting_type || 'Business Review',
                        location: browserTimeZone(),
                        description: apt.description || "",
                        date: localDateString(start),
                        timeStart: hh_mm_full,
                        timeEnd: hh_mm_end_full,
                        entity_id: apt.assigned_for.entity_id || apt.assigned_for.id,
                        assigned_for: apt.assigned_for.id,
                        entity_type: formattedType
                    });
                } catch (error) {
                    console.error("Failed to load selectable users", error);
                } finally {
                    setLoadingAssignedFor(false);
                }
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleCancel = () => {
        setFormErrors({});
        setConflictError(null);
        if (isNewEvent) {
            if (modalInstance) modalInstance.hide();
        } else {
            setViewMode(true);
        }
    };

    /**
     * Books the picked date and start time in Calendly (its event type sets the
     * length); Calendly sends both people its invitation. A time not open in
     * Calendly is refused by the API with that day's open times.
     */
    const submitToCalendly = async () => {
        if (!formData.subject.trim()) {
            setFormErrors({ subject: 'Appointment title is required' });
            return;
        }
        if (!calendlyEventType || !formData.date || !formData.timeStart || (calendlyAsksLocation && !calendlyLocation.trim())) return;

        const payload = {
            event_type_uri: calendlyEventType.uri,
            // Local wall time in the chosen zone; the API reads it in `timezone`.
            start_time: `${formData.date} ${formData.timeStart}:00`,
            timezone: formData.location,
            subject: formData.subject.trim(),
            meeting_type: formData.category,
        };
        if (!calendlyAttendee) {
            setFormErrors({ assigned_for: 'Choose who the meeting is with' });
            return;
        }
        payload.assigned_for = Number(calendlyAttendee);
        if (calendlyLocationChoice) payload.location_kind = calendlyLocationChoice.kind;
        if (calendlyAsksLocation) payload.location = calendlyLocation.trim();
        if (formData.description) payload.description = formData.description;

        try {
            setIsSubmitting(true);
            const response = await bookCalendlyAppointment(payload);
            toast.success(response?.message || 'Meeting booked in Calendly');
            queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all });
            if (modalInstance) modalInstance.hide();
            if (onSuccess) onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
                // No usable number in FCH for a phone call: ask for it here.
                if (error.response.data.errors.location) setAskCalendlyPhone(true);
            } else {
                toast.error(error.response?.data?.message || 'Calendly could not book this meeting');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setFormErrors({});

        if (inCalendly) {
            await submitToCalendly();
            return;
        }

        const toMySQLDate = (date) => {
            const pad = (num) => (num < 10 ? '0' + num : num);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        // Fetch description
        const descVal = formData.description;

        const startDateTime = new Date(`${formData.date}T${formData.timeStart}`);
        // An end at or before the start is on the next day (R2 BUG-024).
        const durationMinutes = minutesBetween(formData.timeStart, formData.timeEnd);

        if (!formData.date) {
            setFormErrors({ appointment_date: "Event date is required" });
            return;
        }

        // Check for conflicts before submission - asked afresh: the background
        // check runs 500ms after a change, so a quick Save went out before it
        // answered and the conflict showed beside "updated successfully" (BUG-100).
        let conflicts = availabilityConflicts;
        if (formData.assigned_for || formData.entity_id) {
            try {
                const response = await checkAvailability(availabilityCheckPayload({
                    date: formData.date,
                    timeStart: formData.timeStart,
                    assignedFor: formData.assigned_for,
                    entityType: formData.entity_type,
                    entityId: formData.entity_id,
                    appointmentId: isNewEvent ? undefined : selectedEventId
                }));
                conflicts = response.data && response.data.available === false ? response.data : null;
                setAvailabilityConflicts(conflicts);
            } catch (error) {
                // The server takes the booking either way; go on with what is known.
            }
        }
        if (conflicts && conflicts.available === false) {
            const allConflicts = [
                ...(conflicts.assignee_conflicts || []),
                ...(conflicts.scheduler_conflicts || [])
            ];
            const matchingConflict = allConflicts.find(c => {
                const cStart = c.start_time || "";
                const cEnd = c.end_time || "";
                const isOverlap = (formData.timeStart < cEnd && endWithinDay(formData.timeStart, formData.timeEnd) > cStart);
                const isSelf = !isNewEvent && String(c.id) === String(selectedEventId);
                return isOverlap && !isSelf;
            });

            if (matchingConflict) {
                toast.error('Cannot save appointment: Time slot conflicts with another appointment');
                setLastConflictingAttempt({
                    attemptedStart: formData.timeStart,
                    attemptedEnd: formData.timeEnd,
                    conflict: matchingConflict
                });
                setIsConflictVisible(true);
                return;
            }
        }

        // FIXED PAYLOAD as requested
        const payload = {
            subject: formData.subject,
            description: descVal,
            appointment_date: toMySQLDate(startDateTime),
            timezone: formData.location,
            duration_minutes: durationMinutes,
            meeting_type: formData.category,
            entity_type: assignedForType || null,
            entity_id: assignedForType ? (formData.entity_id ? parseInt(formData.entity_id) : null) : null,
            assigned_for: formData.assigned_for ? parseInt(formData.assigned_for) : null,
            [isHost ? 'meeting_with' : 'meeting_with_host']: isMeetingWithChecked ? 1 : 0
        };

        // The invitee only moves the meeting: who it is with stays as booked.
        if (isInvitee) {
            delete payload.entity_type;
            delete payload.entity_id;
            delete payload[isHost ? 'meeting_with' : 'meeting_with_host'];
            payload.assigned_for = displayData.assignedForUserId;
        }

        try {
            setIsSubmitting(true);
            let response;
            if (selectedEventId && !isNewEvent) {
                response = await updateAppointment(selectedEventId, payload);
            } else {
                response = await createAppointment(payload);
            }

            if (response && response.status) {
                toast.success(response.message || `Appointment ${isNewEvent ? 'created' : 'updated'} successfully`);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || `Failed to ${isNewEvent ? 'create' : 'update'} appointment`);
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            } else if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || 'Failed to save appointment');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmClose = () => {
        setShowDeleteConfirm(false);
        if (modalInstance) modalInstance.show();
    };

    const confirmDelete = () => {
        if (!selectedEventId) return;
        if (modalInstance) modalInstance.hide();
        setShowDeleteConfirm(true);
    };

    const updateStatus = async (status) => {
        try {
            setIsUpdatingStatus(true);
            const response = await updateAppointment(selectedEventId, {
                assigned_for: displayData.assignedForUserId,
                status,
            });
            if (response && response.status) {
                toast.success(response.message || "Appointment updated successfully");
                askingCancelRef.current = false;
                setShowCancelConfirm(false);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || "Failed to update appointment");
            }
        } catch (error) {
            if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || "Failed to update appointment");
            }
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const confirmCancel = () => {
        if (!selectedEventId) return;
        if (modalInstance) modalInstance.hide();
        askingCancelRef.current = true;
        setShowCancelConfirm(true);
    };

    const handleCancelConfirmClose = () => {
        setShowCancelConfirm(false);
        if (!askingCancelRef.current) return;
        askingCancelRef.current = false;
        if (modalInstance) modalInstance.show();
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            const response = await deleteAppointment(selectedEventId);
            if (response && response.status) {
                toast.success(response.message || "Appointment deleted successfully");
                setShowDeleteConfirm(false);
                if (modalInstance) modalInstance.hide();
                if (onSuccess) onSuccess();
            } else {
                toast.error(response?.message || "Failed to delete appointment");
            }
        } catch (error) {
            if (error.response?.status !== 403) {
                toast.error(error.response?.data?.message || "Failed to delete appointment");
            }
        } finally {
            setIsDeleting(false);
        }
    };




    // Use global Summernote hook
    const { editorRef: descriptionRef } = useSummernote('description', formData.description, (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            description: value
        }));
    }, {
        height: 150,
        placeholder: 'Enter description here...',
        dialogsInBody: true
    }, !viewMode); // Pass !viewMode as the enabled state

    const assignedOptions = selectableUsers.map(u => ({
        label: u.name,
        value: u.id, // User ID is unique and should be used as the value for selection
        entity_id: u.entity_id,
        entity_type: u.entity_type
    }));

    // Debug logging
    if (assignedOptions.length > 0 && formData.assigned_for) {
        console.log('[AppointmentModal] Dropdown state:', {
            formData_assigned_for: formData.assigned_for,
            assignedOptions,
            match: assignedOptions.find(opt => opt.value === formData.assigned_for)
        });
    }

    return (
        <>
            <div className="modal fade appointment-modal-theme" id="appointmentModal" ref={eventModalRef} tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header p-3 bg-info-subtle">
                            <h5 className="modal-title">
                                {viewMode ? "Appointment Details" : (isNewEvent ? "Add Appointment" : "Edit Appointment")}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <div className="modal-body p-4" style={{ backgroundColor: '#fdfdfd' }}>
                            {/* Details View */}
                            {viewMode ? (
                                loadingDetails ? (
                                    <div className="event-details-skeleton">
                                        <div className="mb-4">
                                            <Skeleton width="120px" height="12px" className="mb-2" />
                                            <Skeleton width="70%" height="28px" />
                                        </div>
                                        <div className="mb-4">
                                            <Skeleton width="100px" height="12px" className="mb-2" />
                                            <div className="bg-light-subtle rounded-3 p-3 border border-light-subtle">
                                                <Skeleton width="100%" height="14px" className="mb-2" />
                                                <Skeleton width="90%" height="14px" className="mb-2" />
                                                <Skeleton width="40%" height="14px" />
                                            </div>
                                        </div>
                                        <div className="row g-4 mb-4">
                                            {[1, 2, 3, 4].map(i => (
                                                <div className="col-md-6" key={i}>
                                                    <div className="d-flex align-items-center">
                                                        <Skeleton shape="circle" size="32px" className="me-3" />
                                                        <div className="flex-grow-1">
                                                            <Skeleton width="60px" height="10px" className="mb-2" />
                                                            <Skeleton width="100px" height="14px" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle d-flex align-items-center">
                                            <Skeleton shape="circle" size="60px" className="me-3" />
                                            <div className="flex-grow-1">
                                                <Skeleton width="80px" height="10px" className="mb-2" />
                                                <Skeleton width="150px" height="18px" />
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                                            <Skeleton width="80px" height="35px" borderRadius="4px" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="event-details position-relative">
                                        <div className="d-flex justify-content-end mb-3" style={{ position: 'absolute', right: '5px', top: '-10px', zIndex: 1 }}>
                                            {(canUpdate && (isScheduler || isInvitee)) && (
                                                <button
                                                    className="btn btn-sm btn-soft-primary d-flex align-items-center px-3 shadow-none"
                                                    onClick={() => setViewMode(false)}
                                                    style={{
                                                        fontWeight: "600",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                >
                                                    {isInvitee ? (
                                                        <><i className="ri-calendar-schedule-line fs-14 me-1"></i> Reschedule</>
                                                    ) : (
                                                        <><i className="ri-pencil-fill fs-14 me-1"></i> Edit</>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div className="mb-4">
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <label className="text-muted fs-11 text-uppercase fw-bold mb-0 letter-spacing-1">Appointment Title</label>
                                            </div>
                                            <h4 className="fw-bold mb-1 text-dark">{displayData.title || "No Title"}</h4>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block letter-spacing-1">Description</label>
                                            <div className="bg-light-subtle rounded-3 p-3 border border-light-subtle">
                                                <div className="text-dark fs-14" style={{ lineHeight: "1.7", letterSpacing: "0.2px" }}>
                                                    {(() => {
                                                        const description = displayData.description || "No Description";
                                                        // Extract text and properly decode common entities for the preview
                                                        const rawText = description
                                                            .replace(/<[^>]*>/g, '')
                                                            .replace(/&nbsp;/g, ' ')
                                                            .replace(/&amp;/g, '&')
                                                            .replace(/&lt;/g, '<')
                                                            .replace(/&gt;/g, '>')
                                                            .replace(/&quot;/g, '"');

                                                        const limit = 180;

                                                        if (!isDescriptionExpanded && rawText.length > limit) {
                                                            return (
                                                                <div className="description-content">
                                                                    {rawText.substring(0, limit)}...
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link p-0 ms-2 fs-12 fw-bold text-primary text-decoration-none shadow-none text-uppercase"
                                                                        onClick={() => setIsDescriptionExpanded(true)}
                                                                    >
                                                                        See more <i className="ri-arrow-down-s-line align-middle"></i>
                                                                    </button>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="description-content">
                                                                <div
                                                                    className="rich-text-content"
                                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                                                                ></div>
                                                                {isDescriptionExpanded && rawText.length > limit && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link p-0 mt-2 fs-12 fw-bold text-primary text-decoration-none shadow-none text-uppercase"
                                                                        onClick={() => setIsDescriptionExpanded(false)}
                                                                    >
                                                                        See less <i className="ri-arrow-up-s-line align-middle"></i>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-4 mb-2">
                                            <DetailItem icon="ri-calendar-event-line" label="Date" value={displayData.date} className="detail-item-col" />
                                            <DetailItem icon="ri-time-line" label="Time Slot" value={`${displayData.timeStart} - ${displayData.timeEnd}`} className="detail-item-col" />
                                            <DetailItem icon="ri-map-pin-line" label="Time Zone" value={displayData.location} className="detail-item-col" />
                                            <DetailItem icon="ri-user-star-line" label="Scheduled By" value={displayData.scheduledBy} className="detail-item-col" />
                                        </div>

                                        <div className="mt-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle d-flex align-items-center">
                                            <div className="flex-shrink-0 me-3">
                                                <div className="avatar-md">
                                                    {displayData.assignedForAvatar ? (
                                                        <img src={displayData.assignedForAvatar} alt="" className="rounded-circle img-thumbnail avatar-title" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="avatar-title rounded-circle bg-primary text-white">
                                                            <i className="ri-user-follow-line fs-24"></i>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 d-flex align-items-center gap-2">
                                                <p className="text-primary-emphasis mb-0 fs-12 uppercase-label">
                                                    Appointment With:
                                                </p>

                                                <h5 className="mb-0 fs-16 fw-bold">
                                                    {displayData.assignedForType ? (
                                                        <a
                                                            href={`/${getShortType(displayData.assignedForType)}/${displayData.assignedForId}`}
                                                            className="text-primary text-decoration-none hover-primary"
                                                        >
                                                            {displayData.assignedFor}
                                                        </a>
                                                    ) : (
                                                        <span className="text-dark">{displayData.assignedFor}</span>
                                                    )}
                                                </h5>

                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                                            {(hasPermission('delete appointments') && isScheduler) && (
                                                <button className="btn btn-soft-danger fw-medium" onClick={confirmDelete} disabled={isDeleting}>
                                                    <i className="ri-delete-bin-line me-1"></i> {isDeleting ? "Deleting..." : "Delete"}
                                                </button>
                                            )}
                                            {canCancel && (
                                                <button className="btn btn-soft-danger fw-medium" onClick={confirmCancel} disabled={isUpdatingStatus}>
                                                    <i className="ri-close-circle-line me-1"></i> Cancel Appointment
                                                </button>
                                            )}
                                            {canConfirm && (
                                                <button className="btn btn-success fw-medium" onClick={() => updateStatus(APPOINTMENT_STATUS.CONFIRMED)} disabled={isUpdatingStatus}>
                                                    <i className="ri-check-line me-1"></i> Confirm
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            ) : (
                                /* Form View */
                                <form onSubmit={handleSubmit}>

                                    <div className="row">

                                        <div className="col-12 mb-3">
                                            <label className="form-label">Appointment Title <span className="text-danger">*</span></label>
                                            <input type="text" className={`form-control ${formErrors.subject ? "is-invalid" : ""}`}
                                                value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Enter appointment title" />
                                            {formErrors.subject && <div className="invalid-feedback">{formErrors.subject}</div>}
                                        </div>

                                        <div className="col-12 mb-3">
                                            <label className="form-label">Type <span className="text-danger">*</span></label>
                                            <Dropdown value={formData.category} options={APPOINTMENT_TYPE_OPTIONS}
                                                onChange={(e) => setFormData(p => ({ ...p, category: e.value }))}
                                                className={`w-100 ${formErrors.meeting_type ? 'p-invalid' : ''}`}
                                                placeholder="Select Type" appendTo="self" />
                                            {formErrors.meeting_type && <div className="text-danger fs-11 mt-1">{formErrors.meeting_type}</div>}
                                        </div>

                                        {/* The invitee cannot change who the meeting is with (BUG-102); booking
                                            with the Calendly owner, the caller is the invitee. */}
                                        {!isInvitee && (
                                        <div className="col-12 mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2 mt-1">
                                                <label className="form-label mb-0">
                                                    {isHost ? "Appointment With" : "Appointment With"} <span className="text-danger">*</span>
                                                </label>
                                                {(!isHost || (isHost && hostEntityId == currentUser?.partner_id)) && (
                                                    <div className="form-check">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="meeting-with-toggle"
                                                            checked={isMeetingWithChecked}
                                                            onChange={(e) => setIsMeetingWithChecked(e.target.checked)}
                                                            name={isHost ? "meeting_with" : "meeting_with_host"}
                                                            value="1"
                                                        />
                                                        <label className="form-check-label ms-1" htmlFor="meeting-with-toggle">
                                                            {isHost ? "Meeting with partner" : "Meeting with host"}
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="position-relative" style={{ minHeight: '38px' }}>
                                                {loadingAssignedFor ? (
                                                    <Skeleton width="100%" height="38px" className="rounded-2" />
                                                ) : (
                                                    <Dropdown value={formData.assigned_for} options={assignedOptions}
                                                        onChange={(e) => {
                                                            const selected = assignedOptions.find(opt => opt.value === e.value);
                                                            const newType = selected?.entity_type?.toLowerCase() || '';
                                                            setAssignedForType(newType);
                                                            setFormData(p => ({
                                                                ...p,
                                                                entity_id: selected?.entity_id || e.value,
                                                                assigned_for: e.value,
                                                                entity_type: newType
                                                            }));
                                                        }}
                                                        placeholder="Select Users"
                                                        className={`w-100 ${formErrors.assigned_for ? 'p-invalid' : ''}`}
                                                        appendTo="self"
                                                        filter
                                                        filterPlaceholder="Search users..." />
                                                )}
                                                {formErrors.assigned_for && <div className="text-danger fs-11 mt-1">{formErrors.assigned_for}</div>}
                                            </div>
                                        </div>
                                        )}

                                        <div className="col-12 position-relative px-0 mb-2" style={{ minHeight: '38px' }}>
                                            <div className="row mx-0">
                                                <div className="col-md-6 col-12 mb-3 px-2">
                                                    <label className="form-label fs-13 fw-semibold">Event Date <span className="text-danger">*</span></label>
                                                    <div className="custom-datepicker">
                                                        <Calendar
                                                            value={parseDate(formData.date)}
                                                            onChange={(e) => {
                                                                const date = e.value;
                                                                const dateString = date
                                                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                                    : "";
                                                                setFormData(prev => {
                                                                    const open = startSlotsFrom(TIME_SLOTS, dateString);
                                                                    if (!dateString || open.some(slot => slot.value === prev.timeStart)) return { ...prev, date: dateString };
                                                                    // That time has passed today: move to the next one still ahead.
                                                                    const next = open[0]?.value ?? prev.timeStart;
                                                                    return { ...prev, date: dateString, timeStart: next, timeEnd: timeAfter(next) };
                                                                });
                                                            }}
                                                            minDate={new Date()}
                                                            dateFormat="yy-mm-dd"
                                                            placeholder="Select date"
                                                            showIcon
                                                            className="w-100"
                                                            appendTo="self"
                                                            readOnlyInput
                                                        />
                                                    </div>
                                                </div>
                                                {/* Synced with Calendly too: the same date and start; Calendly's event type sets the length. */}
                                                <div className="col-md-6 col-12 mb-3 px-2">
                                                    <label className="form-label fs-13 fw-semibold">Time Slot <span className="text-danger">*</span></label>
                                                    <div className="d-flex align-items-center gap-2 time-slot-container">
                                                        <Dropdown value={formData.timeStart} options={startOptions}
                                                            onChange={(e) => {
                                                                const startVal = e.value;
                                                                // Half an hour later, past midnight too (R2 BUG-024).
                                                                setFormData(p => ({ ...p, timeStart: startVal, timeEnd: timeAfter(startVal) }));
                                                            }}
                                                            className="flex-grow-1" placeholder="Start" appendTo="self" />
                                                        <span className="text-muted fw-bold">to</span>
                                                        {calendlySynced ? (
                                                            // Calendly sets the length: the end is shown, not picked.
                                                            <input type="text" readOnly aria-label="End"
                                                                className="form-control flex-grow-1 calendly-end-time"
                                                                style={{ minWidth: 0, flex: '1 1 0' }}
                                                                value={timeLabel(formData.timeEnd)} />
                                                        ) : (
                                                            <Dropdown value={formData.timeEnd}
                                                                options={endSlotsAfter(TIME_SLOTS, formData.timeStart)}
                                                                onChange={(e) => {
                                                                    setFormData(p => ({ ...p, timeEnd: e.value }));
                                                                }}
                                                                className={`flex-grow-1 ${formErrors.duration_minutes ? 'p-invalid' : ''}`} placeholder="End" appendTo="self" />
                                                        )}
                                                    </div>
                                                    {calendlySynced && !timeSlotError && calendlyEventType && (
                                                        <div className="text-muted fs-11 mt-1">Calendly books {calendlyMinutes} min ({calendlyEventType.name}).</div>
                                                    )}
                                                    {timeSlotError && <div className="text-danger fs-11 mt-1">{timeSlotError}</div>}
                                                </div>
                                                {/* The date/time refused (e.g. a time Calendly does not offer): full width under
                                                    the date and time - a Calendly reason with its open times is long. */}
                                                {formErrors.appointment_date && (
                                                    <div className="col-12 px-2 mb-3 appointment-date-error">
                                                        <div className="alert alert-danger-subtle border border-danger-subtle d-flex align-items-start mb-0 py-2 fs-12" role="alert">
                                                            <i className="ri-error-warning-fill me-2 fs-16 text-danger"></i>
                                                            <span className="text-danger">{[].concat(formErrors.appointment_date)[0]}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Availability Alert - Animated Collapse */}
                                        <div className="col-12 px-2 overflow-hidden"
                                            style={{ transition: 'all 0.4s ease', maxHeight: !calendlySynced && isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '200px' : '0', opacity: !calendlySynced && isConflictVisible ? 1 : 0, marginBottom: !calendlySynced && isConflictVisible && (availabilityConflicts || lastConflictingAttempt) ? '1rem' : '0' }}>
                                            {!calendlySynced && (availabilityConflicts || lastConflictingAttempt) && (
                                                <div className="alert alert-danger-subtle border border-danger-subtle d-flex align-items-center mb-0 py-2 position-relative" role="alert">
                                                    <i className="ri-error-warning-fill me-2 fs-18 text-danger"></i>
                                                    <div className="flex-grow-1 pe-4">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <strong className="text-danger fs-13 text-uppercase">Scheduling Conflict</strong>
                                                            <span className="badge bg-danger text-white fs-10 px-2 py-1">CONFLICTED</span>
                                                        </div>
                                                        <span className="fs-12 text-muted d-block mt-1">
                                                            {(() => {
                                                                const attempt = lastConflictingAttempt;
                                                                if (attempt) {
                                                                    const { attemptedStart, attemptedEnd, conflict } = attempt;
                                                                    return (
                                                                        <>
                                                                            Your selected <span className="fw-bold">{tConvert(attemptedStart)} - {tConvert(attemptedEnd)}</span> conflicts with an existing appointment on <span className="fw-bold">{conflict.date}</span> from <span className="fw-bold">{tConvert(conflict.start_time)} to {tConvert(conflict.end_time)}</span>.
                                                                        </>
                                                                    );
                                                                }
                                                                return "Conflicting appointment found on this date.";
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <button type="button" className="btn-close fs-10 position-absolute"
                                                        style={{ right: '8px', top: '8px' }}
                                                        onClick={() => setIsConflictVisible(false)} aria-label="Close"></button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Synced with Calendly: the picked time overlaps (not open in Calendly, or taken in FCH). */}
                                        {/* While Calendly is checked (a new date or person): one skeleton, where the answer appears. */}
                                        {calendlySynced && (checkingCalendly || (calendlyOverlap && searchingNextOpen)) && (
                                            <div className="col-12 px-2 mb-3" aria-busy="true" aria-label="Checking Calendly availability">
                                                <Skeleton width="100%" height="56px" className="rounded-2" />
                                            </div>
                                        )}
                                        {calendlySynced && calendlyOverlap && !searchingNextOpen && (
                                            <div className="col-12 px-2 mb-3 calendly-overlap">
                                                <div className="alert alert-light border d-flex align-items-start mb-0 py-2" role="status">
                                                    <i className="ri-time-line me-2 fs-18 text-primary"></i>
                                                    <div className="flex-grow-1">
                                                        <strong className="fs-13 text-dark">Pick an open time</strong>
                                                        <span className="fs-12 text-muted d-block mt-1">
                                                            <span className="fw-bold">{tConvert(formData.timeStart)} - {tConvert(formData.timeEnd)}</span> on <span className="fw-bold">{formData.date}</span>{' '}
                                                            {calendlyOverlapBooked
                                                                ? <>is <span className="fw-bold">already booked</span> - another meeting (in Calendly or here) is at that time.</>
                                                                : calendlyHours
                                                                    ? <>is <span className="fw-bold">outside Calendly&apos;s hours</span> that day (<span className="fw-bold">{tConvert(calendlyHours.from)} - {tConvert(calendlyHours.to)}</span>).</>
                                                                    : formData.date === localDateString()
                                                                        ? <>has <span className="fw-bold">no open time in Calendly</span> - Calendly isn&apos;t taking bookings for the rest of today: it needs more notice before a meeting (its &quot;minimum notice&quot; setting), or its hours are over.</>
                                                                        : <>has <span className="fw-bold">no open time in Calendly</span> - Calendly is closed that day (no available hours).</>}
                                                        </span>
                                                        {calendlyOpenTimes.length > 0 && (
                                                            <div className="mt-2">
                                                                <span className="fs-12 text-muted d-block mb-1">Open start times on {formData.date} ({calendlyMinutes} min each):</span>
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {calendlyOpenTimes.map(slot => (
                                                                        <button key={slot.start_time} type="button" className="btn btn-sm btn-outline-primary py-0 px-2 fs-11"
                                                                            onClick={() => pickCalendlyTime(formData.date, slot)}>
                                                                            {slot.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {calendlyOpenTimes.length === 0 && !findingNextOpen && !calendlyNextOpen && (
                                                            <span className="fs-12 text-muted d-block mt-2">No open day in Calendly in the next 7 days - check its availability in Calendly.</span>
                                                        )}
                                                        {calendlyOpenTimes.length === 0 && calendlyNextOpen && (
                                                            <div className="mt-2 calendly-next-open">
                                                                <span className="fs-12 text-muted d-block mb-1">Next open day - <span className="fw-bold">{calendlyNextOpen.date}</span>:</span>
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {calendlyNextOpen.slots.map(slot => (
                                                                        <button key={slot.start_time} type="button" className="btn btn-sm btn-outline-primary py-0 px-2 fs-11"
                                                                            onClick={() => pickCalendlyTime(calendlyNextOpen.date, slot)}>
                                                                            {slot.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {calendlySynced && calendlyCheckError && (
                                            <div className="col-12 px-2 mb-3">
                                                <div className="text-danger fs-12" role="alert">{calendlyCheckError}</div>
                                            </div>
                                        )}
                                        {/* Skeleton Loader for Availability Check */}
                                        {isCheckingAvailability && !calendlySynced && (
                                            <div className="col-12 px-2 mt-2">
                                                <div className="alert alert-light border d-flex align-items-center mb-0 py-2 fs-12" role="status" aria-live="polite">
                                                    <span className="spinner-border spinner-border-sm text-primary me-2 flex-shrink-0" style={{ width: 16, height: 16 }} aria-hidden="true"></span>
                                                    <span className="text-muted">Checking availability…</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="col-12 mb-3">
                                            <label className="form-label fs-13 fw-semibold" htmlFor="appointment-time-zone">Time Zone</label>
                                            <input id="appointment-time-zone" type="text" readOnly
                                                className={`form-control ${formErrors.timezone ? 'is-invalid' : ''}`}
                                                value={timeZoneLabel(formData.location)} />
                                            <div className="text-muted fs-11 mt-1">Times are booked and shown in your time zone.</div>
                                            {formErrors.timezone && <div className="text-danger fs-11 mt-1">{formErrors.timezone}</div>}
                                        </div>

                                        <div className="col-12 mb-3">
                                            <label className="form-label fs-13 fw-semibold">Description</label>
                                            <div ref={descriptionRef}></div>
                                        </div>

                                        {/* Only when the company Calendly is connected. */}
                                        {canBookInCalendly && (
                                            <div className="col-12 mb-3">
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="book-in-calendly-toggle"
                                                        checked={bookInCalendly}
                                                        // First who it is with, then Calendly: their free times are what is checked.
                                                        disabled={!calendlyAttendee}
                                                        onChange={(e) => setBookInCalendly(e.target.checked)}
                                                    />
                                                    <label className="form-check-label ms-1" htmlFor="book-in-calendly-toggle">
                                                        Sync with Calendly
                                                    </label>
                                                </div>
                                                <div className="text-muted fs-11 mt-1">
                                                    {calendlyAttendee
                                                        ? 'Also booked in Calendly at this date and time; Calendly sends both people the invitation.'
                                                        : 'Choose who the meeting is with ("Appointment With") first - then Calendly is checked for that person.'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Editing a Calendly meeting: it stays synced - a new title or time is changed in Calendly too. */}
                                        {!isNewEvent && editingCalendlyMeeting && (
                                            <div className="col-12 mb-3 calendly-synced">
                                                <div className="form-check">
                                                    <input className="form-check-input" type="checkbox" id="synced-with-calendly" checked disabled readOnly />
                                                    <label className="form-check-label ms-1" htmlFor="synced-with-calendly">
                                                        Sync with Calendly
                                                    </label>
                                                </div>
                                                <div className="text-muted fs-11 mt-1">
                                                    This meeting is in Calendly: a new title or time is changed there too, and Calendly sends both people the update. Deleting it cancels it in Calendly.
                                                </div>
                                            </div>
                                        )}

                                        {inCalendly && (
                                            <>
                                                {!loadingEventTypes && calendlyEventTypes.length === 0 && (
                                                    <div className="col-12 mb-3">
                                                        <div className="text-danger fs-12" role="alert">
                                                            The Calendly account has no event type switched on - turn one on in Calendly first.
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Several places offered (Calendly's "All options"): which one. */}
                                                {calendlyLocationOptions.length > 1 && (
                                                    <div className="col-12 mb-3 calendly-location-kind">
                                                        <label className="form-label fs-13 fw-semibold">Location <span className="text-danger">*</span></label>
                                                        <Dropdown
                                                            value={calendlyLocationChoice?.kind || null}
                                                            options={calendlyLocationOptions.map(option => ({ label: option.label, value: option.kind }))}
                                                            onChange={(e) => { setCalendlyLocationKind(e.value); setCalendlyLocation(''); }}
                                                            className={`w-100 ${formErrors.location_kind ? 'p-invalid' : ''}`} appendTo="self" />
                                                        {formErrors.location_kind && <div className="text-danger fs-11 mt-1">{[].concat(formErrors.location_kind)[0]}</div>}
                                                    </div>
                                                )}

                                                {calendlyAsksLocation && (
                                                    <div className="col-12 mb-3">
                                                        <label className="form-label fs-13 fw-semibold" htmlFor="calendly-location">
                                                            {calendlyLocationLabel} <span className="text-danger">*</span>
                                                        </label>
                                                        <input id="calendly-location" type={calendlyLocationKindInUse === 'outbound_call' ? 'tel' : 'text'}
                                                            className={`form-control ${formErrors.location ? 'is-invalid' : ''}`}
                                                            maxLength={255} value={calendlyLocation}
                                                            placeholder={calendlyLocationKindInUse === 'outbound_call' ? 'e.g. +880 1711 000000' : ''}
                                                            onChange={(e) => setCalendlyLocation(e.target.value)} />
                                                        <div className="text-muted fs-11 mt-1">This Calendly event type needs it - Calendly will not book without it.</div>
                                                        {formErrors.location && <div className="invalid-feedback d-block">{[].concat(formErrors.location)[0]}</div>}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="hstack gap-2 justify-content-end mt-4 pt-3 border-top">
                                        <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
                                        {((isNewEvent && hasPermission('create appointments')) || (!isNewEvent && hasPermission('update appointments'))) && (
                                            <button type="submit" className="btn btn-primary"
                                                disabled={isSubmitting || (inCalendly
                                                    ? (loadingEventTypes || !calendlyEventType || checkingCalendly || calendlyOverlap || isCheckingAvailability || isConflictVisible || (calendlyAsksLocation && !calendlyLocation.trim()))
                                                    : (isCheckingAvailability || isConflictVisible
                                                        // Editing a Calendly meeting: not while Calendly is asked, nor at a time it is not open.
                                                        || (calendlySynced && (checkingCalendly || calendlyOverlap))))}>
                                                {isSubmitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className={`${isNewEvent ? 'ri-add-line' : 'ri-save-line'} me-1 align-middle`}></i>
                                                        {isNewEvent ? "Confirm Appointment" : "Save Changes"}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

            </div >
            <DeleteConfirmationModal
                show={showDeleteConfirm}
                onConfirm={handleDelete}
                onClose={handleConfirmClose}
                loading={isDeleting}
                text="Are you sure you want to delete this appointment? This action cannot be undone."
            />
            <ConfirmationModal
                show={showCancelConfirm}
                onHide={handleCancelConfirmClose}
                onConfirm={() => updateStatus(APPOINTMENT_STATUS.CANCELLED)}
                loading={isUpdatingStatus}
                title="Cancel this appointment?"
                message="The person who booked it will see it as cancelled."
                confirmText="Yes, cancel it"
                variant="danger"
            />
        </>
    );
});

const DetailItem = ({ icon, label, value, className }) => (
    <div className={`col-md-6 ${className || ''}`}>
        <div className="d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
                <div className="avatar-xs">
                    <div className="avatar-title rounded-circle bg-light text-primary">
                        <i className={`${icon} fs-16`}></i>
                    </div>
                </div>
            </div>
            <div className="flex-grow-1">
                <p className="text-muted mb-0 fs-12 uppercase-label">{label}</p>
                <h6 className="mb-0 fs-14 fw-bold text-dark">{value}</h6>
            </div>
        </div>
    </div>
);

export default AppointmentModal;
