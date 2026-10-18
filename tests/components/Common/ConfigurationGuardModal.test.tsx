import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import ConfigurationGuardModal from '../../../src/components/Common/ConfigurationGuardModal';
import { PARTNER_TYPES } from '../../../src/config/partnerTypeOptions';
import { useAuthStore } from '../../../src/store/auth/authStore';
import { useConfigStore } from '../../../src/store/config';
import { renderWithProviders, screen } from '../../test-utils';

/**
 * The guard that stops a partner working on a page whose global settings are not
 * finished yet.
 *
 * The Embedded Form configuration page belongs in that set: the form it
 * configures sends a notification on every submission, and a White-Label partner
 * with no mail configuration of its own sends nothing at all (the API refuses to
 * fall back to the host's mailbox). Letting the partner publish a form that
 * silently drops its leads is the failure these cover.
 *
 * The host is never guarded - it is the tenant everyone else falls back to.
 */
const EMBED_FORM_CONFIG_ROUTE = '/embed-form/settings';

const completeFlags = {
    is_fresh_email: true,
    is_fresh_settings: true,
    is_fresh_payment: true,
};

function signIn(overrides: Record<string, unknown> = {}) {
    useAuthStore.setState({
        user: {
            id: 1,
            is_host: 0,
            partner_type: PARTNER_TYPES.WHITE_LABEL,
            ...overrides,
        },
    } as never);
}

function setFlags(flags: Record<string, unknown>) {
    useConfigStore.setState({
        branding: { primary_color: '#0d6efd' },
        statusFlags: flags,
    } as never);
}

function renderAt(route: string) {
    return renderWithProviders(<ConfigurationGuardModal />, { route });
}

describe('ConfigurationGuardModal on the Embedded Form configuration page', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null } as never);
        useConfigStore.setState({ branding: null, statusFlags: null } as never);
    });

    it('warns a white-label partner whose email configuration is missing', () => {
        signIn();
        setFlags({ ...completeFlags, is_fresh_email: false });

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
        expect(screen.getByText('Email Configuration')).toBeInTheDocument();
    });

    it('warns a white-label partner whose branding is missing', () => {
        signIn();
        setFlags({ ...completeFlags, is_fresh_settings: false });

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
        expect(screen.getByText('Branding Configuration')).toBeInTheDocument();
    });

    it('warns a certified partner whose payment settings are missing', () => {
        signIn({ partner_type: PARTNER_TYPES.CERTIFIED });
        setFlags({ ...completeFlags, is_fresh_payment: false });

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
        expect(screen.getByText('Payment Integration')).toBeInTheDocument();
    });

    it('stays out of the way once everything is configured', () => {
        signIn();
        setFlags(completeFlags);

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('never blocks the host partner', () => {
        // The host is the fallback for everyone else, so an unset flag here is
        // not the same failure - and blocking it would lock the platform out of
        // its own form.
        signIn({ is_host: 1 });
        setFlags({ ...completeFlags, is_fresh_email: false });

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('waits for the flags to load before deciding anything', () => {
        // statusFlags is null until the config request lands. Treating that as
        // "missing" flashed the modal at every partner on every page load.
        signIn();
        useConfigStore.setState({ branding: null, statusFlags: null } as never);

        renderAt(EMBED_FORM_CONFIG_ROUTE);

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('leaves the submissions list alone', () => {
        // Only the configuration page is guarded. Reading leads that already
        // arrived is not blocked by settings being unfinished.
        signIn();
        setFlags({ ...completeFlags, is_fresh_email: false });

        renderAt('/embed-form/loan-applications');

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });
});

function Where() {
    return <output aria-label="location">{useLocation().pathname}</output>;
}

/** The modal, with a router that keeps it mounted across navigation. */
function renderRouted(route: string) {
    return renderWithProviders(
        <>
            <ConfigurationGuardModal />
            <Routes>
                <Route path="*" element={<Where />} />
            </Routes>
        </>,
        { route },
    );
}

const location = () => screen.getByLabelText('location').textContent;

describe('ConfigurationGuardModal sections', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null } as never);
        useConfigStore.setState({ branding: null, statusFlags: null, setupPromptOpen: false } as never);
    });

    it.each([
        ['Branding Configuration', { is_fresh_settings: false }, '/settings/branding'],
        ['Email Configuration', { is_fresh_email: false }, '/settings/email-configuration'],
        ['Payment Integration', { is_fresh_payment: false }, '/settings/payment-integration'],
    ])('opens the %s settings itself', async (section, missing, path) => {
        signIn();
        setFlags({ ...completeFlags, ...missing });
        const user = userEvent.setup();

        renderRouted('/clients');
        await user.click(screen.getByRole('button', { name: new RegExp(section) }));

        expect(location()).toBe(path);
    });
});

describe('ConfigurationGuardModal after a payment', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null } as never);
        useConfigStore.setState({ branding: null, statusFlags: null, setupPromptOpen: false } as never);
    });

    it('lists what is left to configure once the partner has paid, on any page', () => {
        signIn();
        setFlags({ ...completeFlags, is_fresh_email: false, is_fresh_settings: false });
        useConfigStore.getState().openSetupPrompt();

        renderRouted('/invoices');

        expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
        expect(screen.getByText(/payment is complete/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Branding Configuration/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Email Configuration/ })).toBeInTheDocument();
    });

    it('can be put off until later', async () => {
        signIn();
        setFlags({ ...completeFlags, is_fresh_email: false });
        useConfigStore.getState().openSetupPrompt();
        const user = userEvent.setup();

        renderRouted('/invoices');
        await user.click(screen.getByRole('button', { name: /later/i }));

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
        expect(useConfigStore.getState().setupPromptOpen).toBe(false);
    });

    it('closes once a section is opened from it', async () => {
        signIn();
        setFlags({ ...completeFlags, is_fresh_email: false });
        useConfigStore.getState().openSetupPrompt();
        const user = userEvent.setup();

        renderRouted('/invoices');
        await user.click(screen.getByRole('button', { name: /Email Configuration/ }));

        expect(location()).toBe('/settings/email-configuration');
        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('stays away when nothing is left to configure', () => {
        signIn();
        setFlags(completeFlags);
        useConfigStore.getState().openSetupPrompt();

        renderRouted('/invoices');

        expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('is not kept across a reload', () => {
        useConfigStore.getState().openSetupPrompt();

        const persisted = JSON.parse(window.localStorage.getItem('app-config-store') ?? '{}');
        expect(persisted.state?.setupPromptOpen).toBeUndefined();
    });
});
