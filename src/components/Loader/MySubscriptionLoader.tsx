import React, { type JSX } from 'react';
import { Skeleton } from 'primereact/skeleton';

export default function MySubscriptionLoader(): JSX.Element {
  return (
    <div className="container-fluid py-3">
      {/* ── 1. Top 3 Metric Cards Skeleton ── */}
      <div className="row g-3 mb-4">
        {/* Card 1: Recent Bill */}
        <div className="col-xl-4 col-md-6 col-12">
          <div className="card billing-card-wrapper h-100 mb-0 shadow-sm border-0">
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Skeleton shape="circle" size="36px" className="flex-shrink-0" />
                  <div>
                    <Skeleton width="90px" height="12px" className="mb-1" />
                  </div>
                </div>
                <Skeleton width="60px" height="20px" className="rounded-1" />
              </div>
              <div className="my-2">
                <Skeleton width="120px" height="24px" className="mb-2" />
                <Skeleton width="160px" height="12px" className="mb-1" />
                <Skeleton width="140px" height="12px" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Upcoming Billing */}
        <div className="col-xl-4 col-md-6 col-12">
          <div className="card billing-card-wrapper h-100 mb-0 shadow-sm border-0">
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Skeleton shape="circle" size="36px" className="flex-shrink-0" />
                  <div>
                    <Skeleton width="110px" height="12px" className="mb-1" />
                  </div>
                </div>
                <Skeleton width="60px" height="20px" className="rounded-1" />
              </div>
              <div className="my-2">
                <Skeleton width="100px" height="24px" className="mb-2" />
                <Skeleton width="150px" height="12px" className="mb-1" />
                <Skeleton width="130px" height="12px" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Default Payment Gateway */}
        <div className="col-xl-4 col-md-12 col-12">
          <div className="card billing-card-wrapper h-100 mb-0 shadow-sm border-0">
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Skeleton shape="circle" size="36px" className="flex-shrink-0" />
                  <div>
                    <Skeleton width="130px" height="12px" className="mb-1" />
                  </div>
                </div>
                <Skeleton width="75px" height="28px" className="rounded-1" />
              </div>
              <div className="d-flex align-items-center gap-3 pt-1">
                <Skeleton width="48px" height="35px" className="rounded-1 flex-shrink-0" />
                <div className="flex-grow-1">
                  <Skeleton width="90px" height="16px" className="mb-1" />
                  <Skeleton width="120px" height="12px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Active Subscription Plan Card Skeleton ── */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card billing-card-wrapper mb-0 shadow-sm border-0">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                <div className="d-flex align-items-center gap-3">
                  <Skeleton shape="circle" size="48px" className="flex-shrink-0" />
                  <div>
                    <Skeleton width="240px" height="18px" className="mb-2" />
                    <Skeleton width="300px" height="12px" />
                  </div>
                </div>
                <Skeleton width="80px" height="24px" className="rounded-1" />
              </div>

              <div className="row g-3">
                <div className="col-xl-3 col-md-6 col-12">
                  <Skeleton width="100px" height="12px" className="mb-2" />
                  <Skeleton width="120px" height="18px" />
                </div>
                <div className="col-xl-3 col-md-6 col-12">
                  <Skeleton width="120px" height="12px" className="mb-2" />
                  <Skeleton width="100px" height="18px" />
                </div>
                <div className="col-xl-3 col-md-6 col-12">
                  <Skeleton width="90px" height="12px" className="mb-2" />
                  <Skeleton width="110px" height="18px" />
                </div>
                <div className="col-xl-3 col-md-6 col-12">
                  <Skeleton width="110px" height="12px" className="mb-2" />
                  <Skeleton width="130px" height="18px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Recent Payment History Table Skeleton ── */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
              <Skeleton width="170px" height="18px" />
              <Skeleton width="120px" height="14px" />
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-4"><Skeleton width="50px" height="12px" /></th>
                      <th className="py-3"><Skeleton width="80px" height="12px" /></th>
                      <th className="py-3"><Skeleton width="110px" height="12px" /></th>
                      <th className="py-3"><Skeleton width="70px" height="12px" /></th>
                      <th className="py-3"><Skeleton width="45px" height="12px" /></th>
                      <th className="py-3 px-4"><Skeleton width="60px" height="12px" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <tr key={idx} className="border-bottom border-light">
                        <td className="py-3 px-4"><Skeleton width="80px" height="14px" /></td>
                        <td className="py-3"><Skeleton width="130px" height="14px" /></td>
                        <td className="py-3"><Skeleton width="100px" height="14px" /></td>
                        <td className="py-3"><Skeleton width="75px" height="14px" /></td>
                        <td className="py-3"><Skeleton width="50px" height="20px" className="rounded-1" /></td>
                        <td className="py-3 px-4"><Skeleton width="75px" height="20px" className="rounded-1" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
