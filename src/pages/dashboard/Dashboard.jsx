import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePermissions } from '../../lib/auth/usePermissions'
import { Button } from 'primereact/button'
import { useAuthStore } from '../../store/auth/authStore';
import { useDashboardData } from '../../modules/dashboard';
import { formatCurrency } from '../../utils/helper';
import TableLoader from '../../components/Loader/TableLoader';
import { logout, clearAuth } from '../../lib/auth';
import '../../../assets/css/reminder.css';

/** Recent Funding Applications: how wide a long list of funding types may grow. */
const FUNDING_TYPE_MAX_WIDTH = 260;

export default function Dashboard() {
  const navigate = useNavigate();
  const { isRestricted } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const userSubscription = useAuthStore((state) => state.userSubscription);
  const isHost = currentUser?.is_host == 1;
  // The login response carries `name` only; `first_name` is kept for sessions that have it.
  const firstName = currentUser?.first_name || currentUser?.name?.trim().split(' ')[0] || 'User';

  const isFreeTrial = !!userSubscription?.is_free_trail;
  const trialEndDate = userSubscription?.free_trail_end_date;

  let isTrialExpired = false;
  if (isFreeTrial && trialEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(trialEndDate);
    end.setHours(0, 0, 0, 0);
    isTrialExpired = today > end;
  }

  useEffect(() => {
    if (isFreeTrial && isTrialExpired) {
      const performLogout = async () => {
        try {
          await logout();
        } catch (err) {
          console.error('Trial expiration logout failed', err);
        } finally {
          clearAuth();
          navigate('/login', { replace: true });
        }
      };
      performLogout();
    }
  }, [isFreeTrial, isTrialExpired, navigate]);

  const showRestriction = isRestricted && !isFreeTrial;

  const { data: dashboardResponse, isLoading } = useDashboardData();
  const dashboardData = dashboardResponse?.data;

  const renderKPI = (title, count, iconClass, colorClass, link, linkText, isCurrency = false) => (
    <div className="col-xl-3 col-md-6 mb-3">
      <div className="card card-animate h-100 mb-0">
        <div className="card-body d-flex align-items-center">
          <div className="flex-grow-1 overflow-hidden">
            <p className="text-uppercase fw-medium text-muted text-truncate mb-2">{title}</p>
            {isLoading ? (
              <div className="skeleton-line col-8 mb-2 d-block" style={{ height: '28px' }}></div>
            ) : (
              <h4 className="fs-22 fw-semibold ff-secondary mb-2">
                {isCurrency ? formatCurrency(count) : count}
              </h4>
            )}
            {link && <Link to={link} className="text-decoration-underline">{linkText}</Link>}
            {!link && linkText && <span className="text-decoration-underline cursor-pointer">{linkText}</span>}
          </div>
          <div className="avatar-sm flex-shrink-0 ms-3">
            <span className={`avatar-title bg-${colorClass}-subtle rounded fs-3`}>
              <i className={`${iconClass} text-${colorClass}`}></i>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-content">
        <div className="container-fluid">
          {/* Welcome header */}
          <div className="row mb-3 pb-1 dashboard-header mt-3">
            <div className="col-12">
              <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                <div className="flex-grow-1">
                  <h4 className="fs-16 mb-1">Welcome, {firstName}!</h4>
                  <p className="text-muted mb-0">Here's what's happening with your business.</p>
                </div>
                <div className="mt-3 mt-lg-0">
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="row g-3 mb-0 align-items-center">
                      {/* Intentionally left blank to mirror template spacing */}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {showRestriction && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card bg-danger-subtle border-0 shadow-sm border-start border-danger border-3">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar-sm">
                          <div className="avatar-title bg-danger text-white rounded-circle fs-20">
                            <i className="ri-error-warning-fill"></i>
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="fs-16 fw-bold text-danger mb-1">Account Restricted: Pending Invoice or Expired Subscription</h5>
                        <p className="text-muted mb-0 fs-14">Your account access is currently restricted due to a pending invoice or expired subscription. Please pay your outstanding invoices or contact the Administrator.</p>
                      </div>
                      <div className="flex-shrink-0 ms-3">
                        <Button
                          label="View & Pay Invoices"
                          icon="ri-bill-line"
                          className="p-button-danger rounded-3"
                          onClick={() => navigate('/invoices')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="row">
            {isHost ? (
              <>
                {renderKPI(
                  "Total Partners",
                  dashboardData?.counts?.total_partners || 0,
                  "las la-handshake",
                  "success",
                  "/partners",
                  "View all partners"
                )}
                {renderKPI(
                  "Total Clients",
                  dashboardData?.counts?.total_clients || 0,
                  "las la-user-friends",
                  "info",
                  "/clients",
                  "View all clients"
                )}
                {renderKPI(
                  "Total Leads",
                  dashboardData?.counts?.total_leads || 0,
                  "las la-chart-pie",
                  "warning",
                  "/leads",
                  "View all Leads"
                )}
                {renderKPI(
                  "My Commission",
                  dashboardData?.counts?.total_commission || 0,
                  "bx bx-wallet",
                  "primary",
                  '/commissions',
                  "View All Commissions",
                  true
                )}
              </>
            ) : (
              <>
                {renderKPI(
                  "Total Clients",
                  dashboardData?.counts?.total_clients || 0,
                  "las la-user-friends",
                  "info",
                  "/clients",
                  "View all clients"
                )}
                {renderKPI(
                  "Total Leads",
                  dashboardData?.counts?.total_leads || 0,
                  "las la-chart-pie",
                  "warning",
                  "/leads",
                  "View all Leads"
                )}
                {renderKPI(
                  "Total Commission",
                  dashboardData?.counts?.total_commission || 0,
                  "bx bx-wallet",
                  "primary",
                  '/commissions',
                  "View All Commissions",
                  true
                )}
                {renderKPI(
                  "Total Funding Applications",
                  dashboardData?.counts?.funding_application || 0,
                  "ri-file-list-3-line",
                  "success",
                  "/intake-review/funding-request",
                  "View all Applications"
                )}
              </>
            )}
          </div>


          <div className='row'>
            <div className='col-xl-8'>
              {/* Pre-Qualification Applications */}
              <div className="row">
                <div className="col-xxl-12 mb-3">
                  <div className="card mb-0">
                    <div className="card-header align-items-center d-flex">
                      <h4 className="card-title mb-0 flex-grow-1">
                        <i className="ri-checkbox-circle-line align-middle me-1 text-primary"></i> Pre-Qualification Applications
                      </h4>
                      <div className="flex-shrink-0">
                        <Link to="/intake-review/pre-qualification" className="text-decoration-underline text-muted">View All <i className="ri-arrow-right-line align-middle"></i></Link>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive table-card">
                        {isLoading ? (
                          <TableLoader rows={5} columns={new Array(6).fill({ style: { minWidth: '100px' } })} />
                        ) : (
                          <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                            <thead className="table-light">
                              <tr className="text-muted text-uppercase">
                                <th scope="col">Funding Type</th>
                                <th scope="col">Date</th>
                                <th scope="col">Borrower</th>
                                {/* <th scope="col">Industry</th> */}
                                <th scope="col">Business Structure</th>
                                <th scope="col">Requested Amount</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData?.latest_pre_qualifications?.length > 0 ? (
                                dashboardData.latest_pre_qualifications.map((app) => (
                                  <tr key={app.id}>
                                    <td className="fw-medium">{app.purpose_of_funding || 'N/A'}</td>
                                    <td>{app.formatted_created_at}</td>
                                    <td>{app.borrower || 'N/A'}</td>
                                    {/* <td>{app.industry_type || 'N/A'}</td> */}
                                    <td>{app.business_structure || 'N/A'}</td>
                                    <td>{formatCurrency(app.funding_requested_amount)}</td>
                                    <td>
                                      <span className={`badge bg-${app.status_class || 'warning'}-subtle text-${app.status_class || 'warning'} p-2 text-uppercase`}>
                                        {app.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="6" className="text-center py-4 text-muted">No pre-qualifications found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xxl-12 mb-3">
                  <div className="card mb-0">
                    <div className="card-header align-items-center d-flex">
                      <h4 className="card-title mb-0 flex-grow-1">
                        <i className="ri-focus-2-line align-middle me-1 text-primary"></i> Recent Funding Applications
                      </h4>
                      <div className="flex-shrink-0">
                        <Link to="/intake-review/funding-request" className="text-decoration-underline text-muted">View All <i className="ri-arrow-right-line align-middle"></i></Link>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive table-card">
                        {isLoading ? (
                          <TableLoader rows={5} columns={new Array(7).fill({ style: { minWidth: '100px' } })} />
                        ) : (
                          <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                            <thead className="table-light">
                              <tr className="text-muted text-uppercase">
                                <th scope="col">Funding Type</th>
                                <th scope="col">Date</th>
                                <th scope="col">Borrower</th>
                                {/* The company on each application: one person can apply for several. */}
                                <th scope="col">Company Name</th>
                                {/* <th scope="col">Industry</th> */}
                                <th scope="col">Requested Amount</th>
                                <th scope="col">Funded Amount</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData?.latest_funding_applications?.length > 0 ? (
                                dashboardData.latest_funding_applications.map((app) => (
                                  <tr key={app.id}>
                                    {/* A long list of funding types stays on one short line; the full text is on hover. */}
                                    <td className="fw-medium">
                                      <div className="text-truncate" style={{ maxWidth: FUNDING_TYPE_MAX_WIDTH }} title={app.purpose_of_funds || 'N/A'}>
                                        {app.purpose_of_funds || 'N/A'}
                                      </div>
                                    </td>
                                    <td>{app.formatted_created_at}</td>
                                    <td>{app.borrower || 'N/A'}</td>
                                    <td>{app.business_name || 'N/A'}</td>
                                    {/* <td>{app.industry_type || 'N/A'}</td> */}
                                    <td>{formatCurrency(app.requested_amount, app.currency_symbol, app.conversion_rate)}</td>
                                    <td>{formatCurrency(app.total_funded_amount, app.currency_symbol, app.conversion_rate)}</td>
                                    <td>
                                      <span className={`badge bg-${app.status_class || 'warning'}-subtle text-${app.status_class || 'warning'} p-2 text-uppercase`}>
                                        {app.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="7" className="text-center py-4 text-muted">No funding applications found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='col-xl-4'>
              <div className="row">
                <div className="col-xl-12 mb-3">
                  <div className="card mb-0">
                    <div className="card-header align-items-center d-flex">
                      <h4 className="card-title mb-0 flex-grow-1">Upcoming Meetings</h4>
                    </div>
                    <div className="card-body pt-0">
                      {isLoading ? (
                        <div className="py-3">
                          <div className="skeleton-line col-12 mb-2 d-block" style={{ height: '16px' }}></div>
                          <div className="skeleton-line col-10 d-block" style={{ height: '16px' }}></div>
                        </div>
                      ) : (dashboardData?.upcoming_meetings?.length > 0) ? (
                        <ul className="list-group list-group-flush border-dashed">
                          {dashboardData.upcoming_meetings.map((meeting, index) => {
                            const date = new Date(meeting.appointment_date);
                            const day = date.getDate();
                            const weekDay = date.toLocaleDateString('en-US', { weekday: 'short' });
                            const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                            return (
                              <li key={index} className="list-group-item ps-0">
                                <div className="row align-items-center g-3">
                                  <div className="col-auto">
                                    <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                                      <div className="text-center">
                                        <h5 className="mb-0">{day}</h5>
                                        <div className="text-muted">{weekDay}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col">
                                    <div className="d-flex align-items-center justify-content-between mb-1">
                                      <h5 className="text-muted mb-0 fs-13">{time}</h5>
                                      <span className="badge bg-info-subtle text-info text-uppercase">{meeting.meeting_type}</span>
                                    </div>
                                    <a href="#" className="text-reset fs-14 mb-0 text-truncate d-block">{meeting.subject}</a>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="text-center py-4 text-muted border-dashed border-0 border-top mt-2">
                          <i className="ri-calendar-event-line fs-24 mb-2 d-block"></i>
                          No upcoming meetings
                        </div>
                      )}

                      <div className="mt-3">
                        <Link to="/appointments" className="btn btn-outline-primary w-100 rounded-pill">
                          <i className="ri-calendar-event-line align-middle me-1"></i> Schedule Meeting
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-12 mb-3">
                  <div className="card mb-0">
                    <div className="card-header align-items-center d-flex">
                      <h4 className="card-title mb-0 flex-grow-1">Upcoming Task & Reminder Events</h4>
                      {dashboardData?.pending_reminders_count > 0 && (
                        <span className="badge bg-primary-subtle text-primary fw-semibold fs-12">
                          {dashboardData.pending_reminders_count} Pending
                        </span>
                      )}
                    </div>
                    <div className="card-body pt-0">
                      {isLoading ? (
                        <div className="py-3">
                          <div className="skeleton-line col-12 mb-2 d-block" style={{ height: '16px' }}></div>
                          <div className="skeleton-line col-10 d-block" style={{ height: '16px' }}></div>
                        </div>
                      ) : (dashboardData?.upcoming_tasks_reminders?.length > 0) ? (
                        <>
                          <ul className="list-group list-group-flush border-dashed">
                            {dashboardData.upcoming_tasks_reminders.map((reminder, index) => {
                              // Formatted by the API's toTimezone() in the viewer's timezone — shown as-is.
                              const day = reminder.display?.activity_day ?? '-';
                              const weekDay = reminder.display?.activity_weekday_short ?? '-';
                              const time = reminder.display?.activity_time ?? '-';

                              return (
                                <li key={index} className="list-group-item ps-0">
                                  <div className="row align-items-center g-3">
                                    <div className="col-auto">
                                      <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                                        <div className="text-center">
                                          <h5 className="mb-0">{day}</h5>
                                          <div className="text-muted">{weekDay}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="col">
                                      <div className="d-flex align-items-center justify-content-between mb-1">
                                        <h5 className="text-muted mb-0 fs-13">{time}</h5>
                                        <span className="badge bg-warning-subtle text-warning text-uppercase">{reminder.reference_type || 'Reminder'}</span>
                                      </div>
                                      <Link to="/reminders" className="text-reset fs-14 mb-0 text-truncate d-block">{reminder.title || reminder.summary || 'Task/Reminder'}</Link>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {dashboardData?.pending_reminders_count > dashboardData?.upcoming_tasks_reminders?.length && (
                            <div className="reminder-more-badge">
                              + {dashboardData.pending_reminders_count - dashboardData.upcoming_tasks_reminders.length} more reminders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4 text-muted border-dashed border-0 border-top mt-2">
                          <i className="ri-alarm-warning-line fs-24 mb-2 d-block"></i>
                          No upcoming tasks/reminders
                        </div>
                      )}

                      <div className="mt-3">
                        <Link to="/reminders" className="btn btn-outline-primary w-100 rounded-pill">
                          <i className="ri-arrow-right-line align-middle me-1"></i> View All Reminders
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xxl-12 mb-3">
                  <div className="card mb-0">
                    <div className="card-header align-items-center d-flex">
                      <h4 className="card-title mb-0 flex-grow-1">
                        <i className="ri-shield-check-line align-middle me-1 text-info"></i> Latest Leads
                      </h4>
                      <div className="flex-shrink-0">
                        <Link to="/leads" className="text-decoration-underline text-muted">View All</Link>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="table-responsive table-card">
                        {isLoading ? (
                          <TableLoader rows={5} columns={new Array(3).fill({ style: { minWidth: '100px' } })} />
                        ) : (
                          <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                            <thead className="table-light">
                              <tr className="text-muted text-uppercase">
                                <th scope="col">Contact Person</th>
                                <th scope="col">Type</th>
                                <th className="text-end" scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData?.latest_leads?.length > 0 ? (
                                dashboardData.latest_leads.map((lead) => (
                                  <tr key={lead.id} className="cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                                    <td>{lead.contact_person}</td>
                                    <td>{lead.lead_type}</td>
                                    <td className="text-end">
                                      <span className="badge bg-primary-subtle text-primary p-2 text-uppercase">
                                        {lead.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="6" className="text-center py-4 text-muted">No leads found</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
