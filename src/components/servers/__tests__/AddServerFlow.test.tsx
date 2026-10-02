import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { AddServerModal } from '@/components/servers/AddServerModal';
import { ServerTable } from '@/components/servers/ServerTable';
import { sentraApi } from '@/services/api';

// Mock EventSource in jsdom test environment
if (typeof window !== 'undefined') {
  class MockEventSource {
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    close = vi.fn();
  }
  (window as any).EventSource = MockEventSource;
}

// Test harness component to render Header and AddServerModal and verify activePage
const TestAppHarness: React.FC<{ initialPage?: 'overview' | 'servers' | 'alerts' }> = ({ initialPage = 'overview' }) => {
  const { activePage, setActivePage } = useApp();

  React.useEffect(() => {
    if (initialPage) {
      setActivePage(initialPage);
    }
  }, [initialPage, setActivePage]);

  return (
    <div>
      <div data-testid="current-page">{activePage}</div>
      <Header />
      <AddServerModal />
      <ServerTable />
    </div>
  );
};

describe('Global Add Server Button and Registration Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getServers to return empty list for testing empty state
    vi.spyOn(sentraApi, 'getServers').mockResolvedValue([]);
    vi.spyOn(sentraApi, 'getDashboardMetrics').mockResolvedValue({
      monitoredServers: { value: 0, trend: 0 },
      activeThreats: { value: 0, criticalCount: 0, trend: 0 },
      totalFlowsAnalyzed: { value: '0', trend: 0 },
      dataProcessedGb: { value: '0', trend: 0 },
      threatRatio: { value: '0.00%', trend: 0 },
    } as any);
  });

  it('navigates from Threat Alerts to Monitored Servers and opens registration modal when global Add Server button is clicked', async () => {
    render(
      <AppProvider>
        <TestAppHarness initialPage="alerts" />
      </AppProvider>
    );

    // Verify initial page is alerts
    expect(screen.getByTestId('current-page').textContent).toBe('alerts');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click global Add Server button in Header
    const globalAddBtn = screen.getByTestId('global-add-server-btn');
    fireEvent.click(globalAddBtn);

    // Verify active page transitioned to 'servers'
    expect(screen.getByTestId('current-page').textContent).toBe('servers');

    // Verify AddServerModal dialog is open
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(within(dialog).getByText('Register Monitored Network Asset')).toBeDefined();
  });

  it('opens and closes the registration form cleanly via Cancel button', async () => {
    render(
      <AppProvider>
        <TestAppHarness initialPage="servers" />
      </AppProvider>
    );

    // Open modal via global Add Server button
    fireEvent.click(screen.getByTestId('global-add-server-btn'));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();

    // Click Cancel button inside modal
    const cancelBtn = within(dialog).getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('opens registration modal from Register First Server empty state action', async () => {
    render(
      <AppProvider>
        <TestAppHarness initialPage="servers" />
      </AppProvider>
    );

    // Wait for server list to render empty state
    const registerFirstBtn = await screen.findByRole('button', { name: /Register First Server/i });
    expect(registerFirstBtn).toBeDefined();

    // Click Register First Server
    fireEvent.click(registerFirstBtn);

    // Verify AddServerModal opens
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(within(dialog).getByText('Register Monitored Network Asset')).toBeDefined();
  });

  it('validates required fields before submitting to API', async () => {
    const createServerSpy = vi.spyOn(sentraApi, 'createServer');

    render(
      <AppProvider>
        <TestAppHarness initialPage="servers" />
      </AppProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('global-add-server-btn'));

    const dialog = screen.getByRole('dialog');
    // Submit without filling inputs
    const submitBtn = within(dialog).getByRole('button', { name: 'Add Server' });
    fireEvent.click(submitBtn);

    // Verify validation errors are shown and createServer was not called
    expect(within(dialog).getByText('Server Name is required')).toBeDefined();
    expect(within(dialog).getByText('Hostname is required')).toBeDefined();
    expect(within(dialog).getByText('IP Address is required')).toBeDefined();
    expect(createServerSpy).not.toHaveBeenCalled();
  });

  it('submits valid data to backend API, closes form, and refreshes servers on success', async () => {
    const mockCreatedServer = {
      id: '99',
      name: 'SOC-Production-Gateway',
      hostname: 'gw-soc-01.corp',
      ipAddress: '10.0.0.100',
      serverType: 'Web Application Server (Nginx / Node)',
      environment: 'production' as const,
      trafficSource: 'Optical Diode Tap' as const,
      monitoringStatus: 'active' as const,
      description: 'Primary edge gateway for telemetry tap.',
      lastActivity: 'Live Telemetry Tap',
      activeThreats: 0,
      stats: {
        packetsProcessed: '0',
        bytesProcessed: '0',
        flowCount: '0',
        connectionRate: '0/s',
        pps: 0,
        bandwidthMbps: 0,
      },
    };

    const createServerSpy = vi.spyOn(sentraApi, 'createServer').mockResolvedValue(mockCreatedServer);
    const getServersSpy = vi.spyOn(sentraApi, 'getServers').mockResolvedValue([mockCreatedServer]);

    render(
      <AppProvider>
        <TestAppHarness initialPage="servers" />
      </AppProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('global-add-server-btn'));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. Inventory Master DB'), {
      target: { value: 'SOC-Production-Gateway' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.0.0.60'), {
      target: { value: '10.0.0.100' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. db-master-01.internal.corp'), {
      target: { value: 'gw-soc-01.corp' },
    });

    // Submit form
    const dialog = screen.getByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: 'Add Server' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createServerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SOC-Production-Gateway',
          ipAddress: '10.0.0.100',
          hostname: 'gw-soc-01.corp',
        })
      );
    });

    // Modal should close on success
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Servers list should be refreshed
    expect(getServersSpy).toHaveBeenCalled();
  });

  it('displays inline error banner and prevents closing when backend server creation fails', async () => {
    vi.spyOn(sentraApi, 'createServer').mockRejectedValue(
      new Error('PostgreSQL database rejected server: IP address already registered.')
    );

    render(
      <AppProvider>
        <TestAppHarness initialPage="servers" />
      </AppProvider>
    );

    // Open modal
    fireEvent.click(screen.getByTestId('global-add-server-btn'));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. Inventory Master DB'), {
      target: { value: 'Duplicate-Server' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 10.0.0.60'), {
      target: { value: '10.0.0.50' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. db-master-01.internal.corp'), {
      target: { value: 'duplicate.corp' },
    });

    // Submit form
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Server' }));

    // Verify error banner is shown with role="alert"
    const alertBanner = await screen.findByRole('alert');
    expect(alertBanner.textContent).toContain('PostgreSQL database rejected server: IP address already registered.');

    // Modal must remain open so user can rectify the issue
    expect(screen.getByRole('dialog')).toBeDefined();
    // Inputs must retain values
    expect((screen.getByPlaceholderText('e.g. Inventory Master DB') as HTMLInputElement).value).toBe('Duplicate-Server');
  });
});
