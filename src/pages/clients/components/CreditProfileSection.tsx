import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, CardBody, Form, FormGroup, Label, Input, Button, Spinner, Table } from 'reactstrap';
import { toast } from 'react-toastify';
import { parseCreditProfilePDF, saveCreditProfile, useClientCreditProfile, clientKeys } from '../../../modules/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dropdown } from 'primereact/dropdown';
import CreditProfileSkeleton from '../../../components/Loader/CreditProfileSkeleton';

const gridColumns = [
    { key: 'all', label: 'ALL' },
    { key: 'revolving', label: 'REVOLVING' },
    { key: 'line_of_credit', label: 'LINE OF CREDIT' },
    { key: 'open', label: 'OPEN' },
    { key: 'installment', label: 'INSTALLMENT' },
    { key: 'mortgage', label: 'MORTGAGE' },
    { key: 'auto', label: 'AUTO' },
    { key: 'student_loans', label: 'STUDENT LOANS' },
    { key: 'unknown', label: 'UNKNOWN' },
    { key: 'custom', label: 'CUSTOM' }
];

interface CreditProfile {
    document_id?: number | string | null;
    metrics?: {
        fico_score?: number | string;
        paydex_score?: number | string;
        experian_intelliscore?: number | string;
        equifax_score?: number | string;
        active_tradelines?: number | string;
        total_credit_limit?: number | string;
        credit_utilization?: number | string;
        recent_inquiries?: number | string;
        delinquent_accounts?: number | string;
        public_records?: number | string;
        collections?: number | string;
        delinquencies_30_60_90?: string;
        summary?: string;
        all_accounts_analysis?: {
            total_accounts?: number | string;
            open_accounts?: number | string;
            closed_accounts?: number | string;
            newest_open_date?: string;
            oldest_open_date?: string;
        };
        open_accounts_analysis?: {
            monthly_payments?: number | string;
            balance?: number | string;
            credit_limit?: number | string;
            available_credit?: number | string;
            utilization_ratio?: number | string;
        };
    };
    personal_info?: {
        name?: string;
        dob?: string;
        ssn?: string;
        email?: string;
        phone?: string;
    };
    addresses?: Array<{
        type: string;
        street: string;
        city: string;
        state: string;
        zip: string;
        date_reported?: string;
    }>;
    trade_accounts?: Array<{
        company: string;
        date_reported?: string;
        status: string;
        rating?: string;
        account_number?: string;
        account_type?: string;
        portfolio_type?: string;
        remarks?: string;
        payment_history_start_date?: string;
        payment_frequency?: string;
        responsibility?: string;
        opened_date?: string;
        terms?: string;
        last_payment_date?: string;
        balance?: number | string;
        high_credit?: number | string;
        limit?: number | string;
        monthly_payment?: number | string;
        actual_payment?: number | string;
        past_due?: number | string;
        months_reviewed?: number | string;
        delinquencies?: string;
        max_delinquency_date?: string;
    }>;
    inquiries?: Array<{
        date?: string;
        company: string;
        industry?: string;
    }>;
    pdf_url?: string;
    pdf?: string;
    mime?: string;
}

interface CreditProfileSectionProps {
    clientId: string | number;
    initialCreditProfile?: CreditProfile | null;
    onRefresh?: () => void;
    isHost?: boolean;
}

export default function CreditProfileSection({
    clientId,
    initialCreditProfile,
    onRefresh,
    isHost = false
}: CreditProfileSectionProps) {
    // Non-host partners can only VIEW credit profile data — no upload, no edit, no save.
    const readOnly = !isHost;
    const [profile, setProfile] = useState<CreditProfile>({});
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [documentId, setDocumentId] = useState<number | string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [activeSubTab, setActiveSubTab] = useState<string>('metrics');
    const [expandedTrades, setExpandedTrades] = useState<Record<number, boolean>>({});
    const [hidePdf, setHidePdf] = useState<boolean>(false);
    const [hideData, setHideData] = useState<boolean>(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();
    const { data: fetchedProfile, isLoading } = useClientCreditProfile(clientId, !!clientId);

    useEffect(() => {
        if (fetchedProfile && fetchedProfile.status && fetchedProfile.data) {
            const creditProfile = fetchedProfile.data;
            if (creditProfile) {
                setProfile(creditProfile);
                setPdfUrl(creditProfile.pdf_url || '');
                setDocumentId(creditProfile.document_id || null);
                if (creditProfile.pdf) {
                    const binaryStr = atob(creditProfile.pdf);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: creditProfile.mime || 'application/pdf' });
                    setPdfBlobUrl(URL.createObjectURL(blob));
                }
            }
        }
    }, [fetchedProfile]);

    useEffect(() => {
        if (initialCreditProfile) {
            setProfile(initialCreditProfile);
            if (initialCreditProfile.pdf_url) {
                setPdfUrl(initialCreditProfile.pdf_url);
            }
            if (initialCreditProfile.document_id) {
                setDocumentId(initialCreditProfile.document_id);
            }
            if (initialCreditProfile.pdf) {
                const binaryStr = atob(initialCreditProfile.pdf);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: initialCreditProfile.mime || 'application/pdf' });
                setPdfBlobUrl(URL.createObjectURL(blob));
            }
        }
    }, [initialCreditProfile]);

    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const pageContent = document.querySelector('.page-content');
        let originalPageContentOverflow = '';
        if (pageContent instanceof HTMLElement) {
            originalPageContentOverflow = pageContent.style.overflow;
            pageContent.style.overflow = 'hidden';
            // overflow:hidden makes .page-content the sticky page header's
            // scroll container, so its top:70px would push it down inside the
            // page. The class lets CSS keep the header in normal flow instead.
            pageContent.classList.add('page-content-scroll-locked');
        }

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            if (pageContent instanceof HTMLElement) {
                pageContent.style.overflow = originalPageContentOverflow;
                pageContent.classList.remove('page-content-scroll-locked');
            }
        };
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are supported.');
            return;
        }

        setIsUploading(true);
        try {
            const response = await parseCreditProfilePDF(clientId, file);
            if (response && response.status && response.data) {
                const parsed = response.data.extracted_data || {};
                const url = response.data.pdf_url || '';
                const docId = response.data.document_id || null;
                setProfile(parsed);
                setPdfUrl(url);
                setDocumentId(docId);
                if (response.data.pdf) {
                    const binaryStr = atob(response.data.pdf);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: response.data.mime || 'application/pdf' });
                    setPdfBlobUrl(URL.createObjectURL(blob));
                }

                // Auto-save the parsed data so it persists in the database immediately.
                // This is essential for non-host partners who don't have a manual Save button.
                try {
                    const personalInfo = parsed.personal_info || {};
                    const payload = {
                        metrics: parsed.metrics || {},
                        personal_info: personalInfo,
                        ssn: personalInfo.ssn || '',
                        addresses: parsed.addresses || [],
                        trade_accounts: parsed.trade_accounts || [],
                        inquiries: parsed.inquiries || [],
                        pdf_url: url,
                        document_id: docId
                    };
                    await saveCreditProfile(clientId, payload);
                    queryClient.invalidateQueries({ queryKey: clientKeys.creditProfile(clientId) });
                } catch (saveErr) {
                    // Status only: the error object carries the request payload (config.data) — client PII.
                    console.error('Failed to auto-save parsed credit profile', (saveErr as any)?.response?.status);
                }

                toast.success('PDF uploaded and credit profile parsed successfully!');
            } else {
                toast.error(response?.message || 'Failed to parse credit profile PDF.');
            }
        } catch (error: any) {
            // Status only: the error object carries the request payload (config.data) — client PII.
            console.error('PDF parsing failed', error?.response?.status);
            toast.error(error?.response?.data?.message || 'An error occurred during PDF parsing.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            metrics: {
                ...(prev.metrics || {}),
                [name]: value
            }
        }));
    };

    const handleAllAccountsAnalysisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            metrics: {
                ...(prev.metrics || {}),
                all_accounts_analysis: {
                    ...((prev.metrics || {}).all_accounts_analysis || {}),
                    [name]: value
                }
            }
        }));
    };

    const handleOpenAccountsAnalysisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            metrics: {
                ...(prev.metrics || {}),
                open_accounts_analysis: {
                    ...((prev.metrics || {}).open_accounts_analysis || {}),
                    [name]: value
                }
            }
        }));
    };

    const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({
            ...prev,
            personal_info: {
                ...(prev.personal_info || {}),
                [name]: value
            }
        }));
    };

    const getGridValue = (
        section: 'all_accounts_analysis' | 'open_accounts_analysis',
        rowKey: string,
        colKey: string
    ): string => {
        const sectionData = (profile.metrics as any)?.[section] || {};
        const rowData = sectionData[rowKey] || {};
        return rowData[colKey] !== undefined && rowData[colKey] !== null ? String(rowData[colKey]) : '';
    };

    const handleGridValueChange = (
        section: 'all_accounts_analysis' | 'open_accounts_analysis',
        rowKey: string,
        colKey: string,
        value: string
    ) => {
        setProfile(prev => {
            const prevMetrics = prev.metrics || {};
            const prevSection = (prevMetrics as any)[section] || {};
            const prevRow = prevSection[rowKey] || {};

            let parsedVal: any = value;
            if (value !== '') {
                if (rowKey.includes('date')) {
                    parsedVal = value;
                } else {
                    parsedVal = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
                    if (isNaN(parsedVal)) {
                        parsedVal = value;
                    }
                }
            } else {
                parsedVal = null;
            }

            const updatedRow = {
                ...prevRow,
                [colKey]: parsedVal
            };

            const updatedSection = {
                ...prevSection,
                [rowKey]: updatedRow
            };

            if (colKey === 'all') {
                if (section === 'all_accounts_analysis') {
                    if (rowKey === 'accounts_grid') updatedSection.total_accounts = parsedVal;
                    if (rowKey === 'open_accounts_grid') {
                        updatedSection.open_accounts = parsedVal;
                        prevMetrics.active_tradelines = parsedVal;
                    }
                    if (rowKey === 'closed_accounts_grid') updatedSection.closed_accounts = parsedVal;
                    if (rowKey === 'newest_open_date_grid') updatedSection.newest_open_date = parsedVal;
                    if (rowKey === 'oldest_open_date_grid') updatedSection.oldest_open_date = parsedVal;
                } else {
                    if (rowKey === 'monthly_payments_grid') updatedSection.monthly_payments = parsedVal;
                    if (rowKey === 'balance_grid') {
                        updatedSection.balance = parsedVal;
                        (updatedSection as any).open_accounts_balance = parsedVal;
                    }
                    if (rowKey === 'credit_limit_grid') {
                        updatedSection.credit_limit = parsedVal;
                        prevMetrics.total_credit_limit = parsedVal;
                    }
                    if (rowKey === 'available_credit_grid') updatedSection.available_credit = parsedVal;
                    if (rowKey === 'utilization_ratio_grid') {
                        updatedSection.utilization_ratio = parsedVal;
                        prevMetrics.credit_utilization = parsedVal;
                    }
                }
            }

            return {
                ...prev,
                metrics: {
                    ...prevMetrics,
                    [section]: updatedSection
                }
            };
        });
    };

    const handleArrayFieldChange = (
        arrayName: 'addresses' | 'trade_accounts' | 'inquiries',
        index: number,
        fieldName: string,
        value: any
    ) => {
        setProfile(prev => {
            const arr = [...(prev[arrayName] || [])];
            arr[index] = {
                ...arr[index],
                [fieldName]: value
            };
            return {
                ...prev,
                [arrayName]: arr
            };
        });
    };

    const addAddressRow = () => {
        setProfile(prev => ({
            ...prev,
            addresses: [
                ...(prev.addresses || []),
                { type: 'CURRENT', street: '', city: '', state: '', zip: '', date_reported: '' }
            ]
        }));
    };

    const removeAddressRow = (index: number) => {
        setProfile(prev => ({
            ...prev,
            addresses: (prev.addresses || []).filter((_, idx) => idx !== index)
        }));
    };

    const addTradeRow = () => {
        setProfile(prev => ({
            ...prev,
            trade_accounts: [
                ...(prev.trade_accounts || []),
                {
                    company: '',
                    status: 'OPEN',
                    account_type: '',
                    limit: '',
                    balance: '',
                    monthly_payment: '',
                    rating: '',
                    account_number: '',
                    portfolio_type: '',
                    opened_date: '',
                    terms: '',
                    last_payment_date: '',
                    actual_payment: '',
                    past_due: '',
                    months_reviewed: '',
                    payment_frequency: '',
                    responsibility: '',
                    payment_history_start_date: '',
                    delinquencies: '',
                    max_delinquency_date: '',
                    remarks: ''
                }
            ]
        }));
    };

    const removeTradeRow = (index: number) => {
        setProfile(prev => ({
            ...prev,
            trade_accounts: (prev.trade_accounts || []).filter((_, idx) => idx !== index)
        }));
    };

    const addInquiryRow = () => {
        setProfile(prev => ({
            ...prev,
            inquiries: [
                ...(prev.inquiries || []),
                { date: '', company: '', industry: '' }
            ]
        }));
    };

    const removeInquiryRow = (index: number) => {
        setProfile(prev => ({
            ...prev,
            inquiries: (prev.inquiries || []).filter((_, idx) => idx !== index)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const personalInfo = profile.personal_info || {};
            const payload = {
                metrics: profile.metrics || {},
                personal_info: personalInfo,
                ssn: personalInfo.ssn || '',
                addresses: profile.addresses || [],
                trade_accounts: profile.trade_accounts || [],
                inquiries: profile.inquiries || [],
                pdf_url: pdfUrl,
                document_id: documentId
            };
            const response = await saveCreditProfile(clientId, payload);
            if (response && response.status) {
                toast.success('Credit profile saved successfully!');
                queryClient.invalidateQueries({ queryKey: clientKeys.creditProfile(clientId) });
            } else {
                toast.error(response?.message || 'Failed to save credit profile.');
            }
        } catch (error: any) {
            // Status only: the error object carries the request payload (config.data) — client PII.
            console.error('Failed to save credit profile', error?.response?.status);
            toast.error(error?.response?.data?.message || 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    const triggerReupload = () => {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setProfile({});
        setPdfUrl('');
        setDocumentId(null);
        setPdfBlobUrl('');
        setHideData(false);
        setHidePdf(false);
    };

    const toggleTradeExpand = (index: number) => {
        setExpandedTrades(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Render parsed state (split-screen view)
    if (isLoading) {
        return <CreditProfileSkeleton />;
    }

    const hasData = pdfUrl || profile.metrics?.fico_score || profile.personal_info?.name;
    if (hasData) {
        const metrics = profile.metrics || {};
        const personal = profile.personal_info || {};
        const addresses = profile.addresses || [];
        const trades = profile.trade_accounts || [];
        const inquiries = profile.inquiries || [];

        return (
            <Form onSubmit={handleSave}>
                <input
                    ref={fileInputRef}
                    type="file"
                    id="credit-report-upload"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="d-none"
                />
                <Row>
                    {/* Left side: Editable parsed data form with sub-tabs */}
                    {!hideData && (
                        <Col lg={hidePdf ? 12 : 6}>
                            <Card className="border shadow-none mb-0" style={{ height: 'calc(100vh - 360px)', display: 'flex', flexDirection: 'column' }}>
                                <div className="card-header bg-light d-flex align-items-center justify-content-between py-3">
                                    <h6 className="card-title mb-0">Extracted Credit Metrics</h6>
                                    <div className="d-flex align-items-center gap-2">

                                        {/* Re-upload & Save */}
                                        <Button
                                            type="button"
                                            color="outline-danger"
                                            size="sm"
                                            onClick={triggerReupload}
                                            disabled={isUploading || isSaving}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Spinner size="sm" className="me-1" /> Parsing...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ri-upload-2-line align-middle me-1"></i> Re-upload PDF
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            color="soft-secondary"
                                            size="sm"
                                            onClick={() => {
                                                setHideData(true);
                                                setHidePdf(false);
                                            }}
                                        >
                                            <i className="ri-eye-off-line align-middle me-1"></i> Hide Data
                                        </Button>
                                        <Button
                                            type="button"
                                            color="soft-secondary"
                                            size="sm"
                                            onClick={() => {
                                                const next = !hidePdf;
                                                setHidePdf(next);
                                                if (next) setHideData(false);
                                            }}
                                        >
                                            <i className={hidePdf ? "ri-eye-line align-middle me-1" : "ri-eye-off-line align-middle me-1"}></i>
                                            {hidePdf ? "Show PDF" : "Hide PDF"}
                                        </Button>

                                        {!readOnly && (
                                            <Button
                                                type="submit"
                                                color="primary"
                                                size="sm"
                                                disabled={isSaving || isUploading}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Spinner size="sm" className="me-2" /> Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-save-line align-middle me-1"></i> Save Credit Profile
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <CardBody className="p-3 credit-profile-metrics-card-body" style={{ flex: 1, overflowY: 'auto' }}>
                                    {/* Sub-navigation for sections */}
                                    <ul className="nav nav-tabs nav-tabs-custom nav-success mb-3 border-bottom" role="tablist">
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${activeSubTab === 'metrics' ? 'active' : ''}`}
                                                onClick={() => setActiveSubTab('metrics')}
                                            >
                                                Summary Metrics
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${activeSubTab === 'personal_address' ? 'active' : ''}`}
                                                onClick={() => setActiveSubTab('personal_address')}
                                            >
                                                Personal & Address Info
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${activeSubTab === 'trade_accounts' ? 'active' : ''}`}
                                                onClick={() => setActiveSubTab('trade_accounts')}
                                            >
                                                Trade Accounts ({trades.length})
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${activeSubTab === 'inquiries' ? 'active' : ''}`}
                                                onClick={() => setActiveSubTab('inquiries')}
                                            >
                                                Inquiries ({inquiries.length})
                                            </button>
                                        </li>
                                    </ul>

                                    <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0 }}>

                                    {/* Tab Contents */}
                                    {activeSubTab === 'metrics' && (
                                        <div>
                                            <Row>
                                                <Col md={12}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">FICO Score</Label>
                                                        <Input
                                                            type="number"
                                                            name="fico_score"
                                                            placeholder="e.g. 720"
                                                            value={metrics.fico_score ?? ''}
                                                            onChange={handleMetricChange}
                                                            disabled={readOnly}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>


                                            {/* All Accounts Analysis Section */}
                                            <h5 className="fs-14 mb-3 text-primary">All Accounts Analysis</h5>
                                            <div className="table-responsive mb-4  rounded">
                                                <Table className="align-middle mb-0 text-center" size="sm">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th className="text-start" style={{ minWidth: '160px' }}>ALL ACCOUNTS</th>
                                                            {gridColumns.map(col => (
                                                                <th key={col.key} style={{ minWidth: col.key === 'all' ? '80px' : '95px', fontSize: '11px' }}>{col.label}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>ACCOUNTS</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('all_accounts_analysis', 'accounts_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('all_accounts_analysis', 'accounts_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>OPEN ACCOUNTS</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('all_accounts_analysis', 'open_accounts_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('all_accounts_analysis', 'open_accounts_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>CLOSED ACCOUNTS</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('all_accounts_analysis', 'closed_accounts_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('all_accounts_analysis', 'closed_accounts_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>NEWEST OPEN DATE</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="MM/DD/YYYY"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '11px' }}
                                                                        value={getGridValue('all_accounts_analysis', 'newest_open_date_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('all_accounts_analysis', 'newest_open_date_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>OLDEST OPEN DATE</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="MM/DD/YYYY"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '11px' }}
                                                                        value={getGridValue('all_accounts_analysis', 'oldest_open_date_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('all_accounts_analysis', 'oldest_open_date_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    </tbody>
                                                </Table>
                                            </div>

                                            {/* Open Accounts Analysis Section */}
                                            <h5 className="fs-14 mb-3 text-primary">Open Accounts Analysis</h5>
                                            <div className="table-responsive mb-4 rounded">
                                                <Table className="align-middle mb-0 text-center" size="sm">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th className="text-start" style={{ minWidth: '160px' }}>OPEN ACCOUNTS</th>
                                                            {gridColumns.map(col => (
                                                                <th key={col.key} style={{ minWidth: col.key === 'all' ? '80px' : '95px', fontSize: '11px' }}>{col.label}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>MONTHLY PAYMENTS</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('open_accounts_analysis', 'monthly_payments_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('open_accounts_analysis', 'monthly_payments_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>BALANCE</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('open_accounts_analysis', 'balance_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('open_accounts_analysis', 'balance_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>CREDIT LIMIT</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('open_accounts_analysis', 'credit_limit_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('open_accounts_analysis', 'credit_limit_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>AVAILABLE CREDIT</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('open_accounts_analysis', 'available_credit_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('open_accounts_analysis', 'available_credit_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            <td className="text-start fw-semibold" style={{ fontSize: '12px' }}>UTILIZATION RATIO</td>
                                                            {gridColumns.map(col => (
                                                                <td key={col.key} className="p-1">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className="form-control-sm text-center px-1"
                                                                        style={{ height: '28px', fontSize: '12px' }}
                                                                        value={getGridValue('open_accounts_analysis', 'utilization_ratio_grid', col.key)}
                                                                        onChange={(e) => handleGridValueChange('open_accounts_analysis', 'utilization_ratio_grid', col.key, e.target.value)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    </tbody>
                                                </Table>
                                            </div>

                                            <hr className="my-3 border-light" />

                                            {/* Other Summary Metrics */}
                                            <h5 className="fs-14 mb-3 text-primary">Other Summary Metrics</h5>
                                            <Row>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">Active Tradelines</Label>
                                                        <Input
                                                            type="number"
                                                            name="active_tradelines"
                                                            value={metrics.active_tradelines ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">Inquiries (6 Mo)</Label>
                                                        <Input
                                                            type="number"
                                                            name="recent_inquiries"
                                                            value={metrics.recent_inquiries ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">Delinquent Accts</Label>
                                                        <Input
                                                            type="number"
                                                            name="delinquent_accounts"
                                                            value={metrics.delinquent_accounts ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">Public Records</Label>
                                                        <Input
                                                            type="number"
                                                            name="public_records"
                                                            value={metrics.public_records ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">Collections</Label>
                                                        <Input
                                                            type="number"
                                                            name="collections"
                                                            placeholder="e.g. 0"
                                                            value={metrics.collections ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                                <Col md={4}>
                                                    <FormGroup className="mb-3">
                                                        <Label className="form-label fw-medium">30/60/90 Delinquency</Label>
                                                        <Input
                                                            type="text"
                                                            name="delinquencies_30_60_90"
                                                            placeholder="e.g. -/-/-"
                                                            value={metrics.delinquencies_30_60_90 ?? ''}
                                                            onChange={handleMetricChange}
                                                        />
                                                    </FormGroup>
                                                </Col>
                                            </Row>

                                            <FormGroup className="mb-3">
                                                <Label className="form-label fw-medium">Credit Profile Summary</Label>
                                                <Input
                                                    type="textarea"
                                                    rows={3}
                                                    name="summary"
                                                    value={metrics.summary ?? ''}
                                                    onChange={handleMetricChange}
                                                />
                                            </FormGroup>
                                        </div>
                                    )}

                                    {activeSubTab === 'personal_address' && (
                                        <div>
                                            {/* Personal Info Card */}
                                            <Card className="border shadow-none mb-3">
                                                <CardBody className="p-3">
                                                    <h5 className="fs-14 mb-3 text-primary">Personal Information</h5>
                                                    <Row>
                                                        <Col md={6}>
                                                            <FormGroup className="mb-3">
                                                                <Label className="form-label fw-medium">Full Name</Label>
                                                                <Input
                                                                    type="text"
                                                                    name="name"
                                                                    value={personal.name ?? ''}
                                                                    onChange={handlePersonalInfoChange}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={6}>
                                                            <FormGroup className="mb-3">
                                                                <Label className="form-label fw-medium">Date of Birth</Label>
                                                                <Input
                                                                    type="text"
                                                                    name="dob"
                                                                    placeholder="MM/DD/YYYY"
                                                                    value={personal.dob ?? ''}
                                                                    onChange={handlePersonalInfoChange}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup className="mb-3">
                                                                <Label className="form-label fw-medium">SSN</Label>
                                                                <Input
                                                                    type="text"
                                                                    name="ssn"
                                                                    value={personal.ssn ?? ''}
                                                                    onChange={handlePersonalInfoChange}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup className="mb-3">
                                                                <Label className="form-label fw-medium">Email</Label>
                                                                <Input
                                                                    type="email"
                                                                    name="email"
                                                                    value={personal.email ?? ''}
                                                                    onChange={handlePersonalInfoChange}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup className="mb-3">
                                                                <Label className="form-label fw-medium">Phone</Label>
                                                                <Input
                                                                    type="text"
                                                                    name="phone"
                                                                    value={personal.phone ?? ''}
                                                                    onChange={handlePersonalInfoChange}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                </CardBody>
                                            </Card>

                                            {/* Address History Table */}
                                            <Card className="border shadow-none mb-0">
                                                <CardBody className="p-3">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h5 className="fs-14 mb-0 text-primary">Address History</h5>
                                                        {!readOnly && (
                                                            <Button type="button" color="soft-success" size="sm" onClick={addAddressRow}>
                                                                <i className="ri-add-line align-middle me-1"></i> Add Address
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="table-responsive">
                                                        <Table className="align-middle table-nowrap mb-0" size="sm">
                                                            <thead className="table-light">
                                                                <tr>
                                                                    <th>Type</th>
                                                                    <th>Street</th>
                                                                    <th>City</th>
                                                                    <th>State</th>
                                                                    <th>Zip</th>
                                                                    <th>Date Reported</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {addresses.map((item, index) => (
                                                                    <tr key={`addr-${index}`}>
                                                                        <td>
                                                                            <Dropdown
                                                                                value={item.type}
                                                                                options={[
                                                                                    { label: 'CURRENT', value: 'CURRENT' },
                                                                                    { label: 'PREVIOUS', value: 'PREVIOUS' }
                                                                                ]}
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'type', e.value)}
                                                                                optionLabel="label"
                                                                                optionValue="value"
                                                                                appendTo="self"
                                                                                className="table-dropdown w-100"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                type="text"
                                                                                value={item.street}
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'street', e.target.value)}
                                                                                className="form-control-sm"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                type="text"
                                                                                value={item.city}
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'city', e.target.value)}
                                                                                className="form-control-sm"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                type="text"
                                                                                value={item.state}
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'state', e.target.value)}
                                                                                className="form-control-sm"
                                                                                style={{ width: '60px' }}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                type="text"
                                                                                value={item.zip}
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'zip', e.target.value)}
                                                                                className="form-control-sm"
                                                                                style={{ width: '80px' }}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                type="text"
                                                                                value={item.date_reported ?? ''}
                                                                                placeholder="MM/DD/YYYY"
                                                                                onChange={(e) => handleArrayFieldChange('addresses', index, 'date_reported', e.target.value)}
                                                                                className="form-control-sm"
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            {!readOnly && (
                                                                                <Button
                                                                                    type="button"
                                                                                    color="soft-danger"
                                                                                    size="sm"
                                                                                    onClick={() => removeAddressRow(index)}
                                                                                >
                                                                                    <i className="ri-delete-bin-line"></i>
                                                                                </Button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {addresses.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={7} className="text-center text-muted py-3">
                                                                            No addresses added yet. Click Add Address to start.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </div>
                                    )}

                                    {activeSubTab === 'trade_accounts' && (
                                        <div>
                                            <div className="d-flex justify-content-end align-items-center mb-3">
                                                {!readOnly && (
                                                    <Button type="button" color="soft-success" size="sm" onClick={addTradeRow}>
                                                        <i className="ri-add-line align-middle me-1"></i> Add Trade Account
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                                                <Table className="align-middle mb-0" size="sm">
                                                    <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
                                                        <tr>
                                                            <th style={{ width: '40px' }}></th>
                                                            <th>Company</th>
                                                            <th>Type</th>
                                                            <th>Status</th>
                                                            <th>Limit ($)</th>
                                                            <th>Balance ($)</th>
                                                            <th>Monthly Pay ($)</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trades.map((item, index) => (
                                                            <React.Fragment key={`trade-${index}`}>
                                                                <tr>
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-link p-0 text-decoration-none"
                                                                            onClick={() => toggleTradeExpand(index)}
                                                                        >
                                                                            <i className={expandedTrades[index] ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}></i>
                                                                        </button>
                                                                    </td>
                                                                    <td>
                                                                        <Input
                                                                            type="text"
                                                                            value={item.company}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'company', e.target.value)}
                                                                            className="form-control-sm fw-medium"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Input
                                                                            type="text"
                                                                            value={item.account_type ?? ''}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'account_type', e.target.value)}
                                                                            className="form-control-sm"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Dropdown
                                                                            value={item.status}
                                                                            options={[
                                                                                { label: 'OPEN', value: 'OPEN' },
                                                                                { label: 'CLOSED', value: 'CLOSED' }
                                                                            ]}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'status', e.value)}
                                                                            optionLabel="label"
                                                                            optionValue="value"
                                                                            appendTo="self"
                                                                            className="table-dropdown w-100"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.limit ?? ''}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'limit', e.target.value)}
                                                                            className="form-control-sm"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.balance ?? ''}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'balance', e.target.value)}
                                                                            className="form-control-sm"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.monthly_payment ?? ''}
                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'monthly_payment', e.target.value)}
                                                                            className="form-control-sm"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Button
                                                                            type="button"
                                                                            color="soft-danger"
                                                                            size="sm"
                                                                            onClick={() => removeTradeRow(index)}
                                                                        >
                                                                            <i className="ri-delete-bin-line"></i>
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                                {expandedTrades[index] && (
                                                                    <tr className="bg-light-subtle">
                                                                        <td colSpan={8} className="p-3">
                                                                            <Row>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Account Number</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.account_number ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'account_number', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Portfolio Type</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.portfolio_type ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'portfolio_type', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Date Of Opening</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.opened_date ?? ''}
                                                                                            placeholder="MM/DD/YYYY"
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'opened_date', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Account Rating</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.rating ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'rating', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">High Credit ($)</Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={item.high_credit ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'high_credit', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Terms</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.terms ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'terms', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Last Payment Date</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.last_payment_date ?? ''}
                                                                                            placeholder="MM/DD/YYYY"
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'last_payment_date', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Actual Payment Amount ($)</Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={item.actual_payment ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'actual_payment', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Past Due ($)</Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={item.past_due ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'past_due', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Months Reviewed</Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={item.months_reviewed ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'months_reviewed', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Payment Frequency</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.payment_frequency ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'payment_frequency', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Responsibility</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.responsibility ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'responsibility', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Payment History Start Date</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.payment_history_start_date ?? ''}
                                                                                            placeholder="MM/DD/YYYY"
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'payment_history_start_date', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">30/60/90 Delinquencies</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.delinquencies ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'delinquencies', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={4}>
                                                                                    <FormGroup className="mb-2">
                                                                                        <Label className="fs-12 fw-medium mb-1">Max Delinquency Date</Label>
                                                                                        <Input
                                                                                            type="text"
                                                                                            value={item.max_delinquency_date ?? ''}
                                                                                            placeholder="MM/DD/YYYY"
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'max_delinquency_date', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                                <Col md={12}>
                                                                                    <FormGroup className="mb-0">
                                                                                        <Label className="fs-12 fw-medium mb-1">Remarks</Label>
                                                                                        <Input
                                                                                            type="textarea"
                                                                                            rows={2}
                                                                                            value={item.remarks ?? ''}
                                                                                            onChange={(e) => handleArrayFieldChange('trade_accounts', index, 'remarks', e.target.value)}
                                                                                            className="form-control-sm"
                                                                                        />
                                                                                    </FormGroup>
                                                                                </Col>
                                                                            </Row>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                        {trades.length === 0 && (
                                                            <tr>
                                                                <td colSpan={8} className="text-center text-muted py-3">
                                                                    No trade accounts added yet. Click Add Trade Account to start.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    {activeSubTab === 'inquiries' && (
                                        <div>
                                            <div className="d-flex justify-content-end align-items-center mb-3">
                                                {!readOnly && (
                                                    <Button type="button" color="soft-success" size="sm" onClick={addInquiryRow}>
                                                        <i className="ri-add-line align-middle me-1"></i> Add Inquiry
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="table-responsive">
                                                <Table className="align-middle table-nowrap mb-0" size="sm">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Company</th>
                                                            <th>Industry</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {inquiries.map((item, index) => (
                                                            <tr key={`inq-${index}`}>
                                                                <td>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.date ?? ''}
                                                                        placeholder="MM/DD/YYYY"
                                                                        onChange={(e) => handleArrayFieldChange('inquiries', index, 'date', e.target.value)}
                                                                        className="form-control-sm"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.company}
                                                                        onChange={(e) => handleArrayFieldChange('inquiries', index, 'company', e.target.value)}
                                                                        className="form-control-sm"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <Input
                                                                        type="text"
                                                                        value={item.industry ?? ''}
                                                                        onChange={(e) => handleArrayFieldChange('inquiries', index, 'industry', e.target.value)}
                                                                        className="form-control-sm"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    {!readOnly && (
                                                                        <Button
                                                                            type="button"
                                                                            color="soft-danger"
                                                                            size="sm"
                                                                            onClick={() => removeInquiryRow(index)}
                                                                        >
                                                                            <i className="ri-delete-bin-line"></i>
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {inquiries.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="text-center text-muted py-3">
                                                                    No credit inquiries recorded. Click Add Inquiry to start.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    </fieldset>
                                </CardBody>
                            </Card>
                        </Col>
                    )}

                    {/* Right side: PDF viewer */}
                    {!hidePdf && (
                        <Col lg={hideData ? 12 : 6}>
                            <Card className="border shadow-none" style={{ height: 'calc(100vh - 360px)', display: 'flex', flexDirection: 'column' }}>
                                <div className="card-header bg-light d-flex align-items-center justify-content-between py-3">
                                    <h6 className="card-title mb-0">Original Credit Report PDF</h6>
                                    <div className="d-flex align-items-center gap-2">
                                        {hideData && (
                                            <Button
                                                type="button"
                                                color="soft-secondary"
                                                size="sm"
                                                onClick={() => setHideData(false)}
                                            >
                                                <i className="ri-eye-line align-middle me-1"></i> Show Data
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            color="soft-secondary"
                                            size="sm"
                                            onClick={() => {
                                                setHidePdf(true);
                                                setHideData(false);
                                            }}
                                        >
                                            <i className="ri-eye-off-line align-middle me-1"></i> Hide PDF
                                        </Button>
                                    </div>
                                </div>
                                <CardBody className="p-0 d-flex flex-column" style={{ flex: 1, overflow: 'hidden' }}>
                                    {pdfBlobUrl ? (
                                        <iframe
                                            src={pdfBlobUrl}
                                            className="w-100"
                                            style={{ flex: 1, border: 'none' }}
                                            title="Credit Report PDF Viewer"
                                        />
                                    ) : (
                                        <div className="d-flex align-items-center justify-content-center h-100 text-muted p-4">
                                            No PDF viewer available. Credit report is loaded from database history.
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    )}
                </Row>
            </Form>
        );
    }

    return (
        <div
            className={`rounded border border-2 border-dashed p-3 text-center transition-all ${dragActive ? 'border-primary bg-primary-subtle' : 'border-muted bg-light'}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{ borderStyle: 'dashed', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
        >
            {isUploading ? (
                <div className="py-2">
                    <Spinner color="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
                    <h5 className="mb-2">Parsing Credit Report PDF...</h5>
                    <p className="text-muted mb-0">Local parser is extracting credit scores, tradelines and records from your document.</p>
                </div>
            ) : (
                <div className="py-2">
                    <div className="mb-3">
                        <i className="ri-upload-cloud-2-fill display-4 text-muted"></i>
                    </div>
                    <h4 className="mb-2">Drag & Drop Credit Report PDF</h4>
                    <p className="text-muted mb-4">or click the button below to select and upload a PDF report</p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        id="credit-report-upload"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="d-none"
                    />
                    <label htmlFor="credit-report-upload" className="btn btn-primary px-4 py-2 cursor-pointer mb-0">
                        <i className="ri-add-line align-middle me-1"></i> Choose PDF Report
                    </label>

                    <p className="text-muted fs-12 mt-3 mb-0">Only digital PDFs are supported. Image/scanned reports will fail parsing.</p>
                </div>
            )}
        </div>
    );
}
