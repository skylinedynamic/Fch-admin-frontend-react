import React from 'react';
import type { BreadcrumbItem } from '../../pages/common/PageHeader';

/**
 * Hand-written declarations for the untyped ApplicationDetailsLoader.jsx.
 * Without these, the component's `breadcrumbs = []` default infers as
 * `never[]`, so every real breadcrumb passed in is rejected.
 */
export interface ApplicationDetailsLoaderProps {
    title?: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

declare function ApplicationDetailsLoader(
    props: ApplicationDetailsLoaderProps
): React.JSX.Element;

export default ApplicationDetailsLoader;
