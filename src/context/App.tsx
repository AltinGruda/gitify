import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useInterval } from '../hooks/useInterval';
import { useNotifications } from '../hooks/useNotifications';
import {
  AccountNotifications,
  Appearance,
  AuthOptions,
  AuthState,
  AuthTokenOptions,
  SettingsState,
} from '../types';
import { apiRequestAuth } from '../utils/api-requests';
import { setAppearance } from '../utils/appearance';
import { addAccount, authGitHub, getToken, getUserData } from '../utils/auth';
import { setAutoLaunch } from '../utils/comms';
import Constants from '../utils/constants';
import { generateGitHubAPIUrl } from '../utils/helpers';
import { clearState, loadState, saveState } from '../utils/storage';

const defaultAccounts: AuthState = {
  token: null,
  enterpriseAccounts: [],
  user: null,
};

export const defaultSettings: SettingsState = {
  participating: false,
  playSound: true,
  showNotifications: true,
  openAtStartup: false,
  appearance: Appearance.SYSTEM,
  colors: null,
  markAsDoneOnOpen: false,
};

interface AppContextState {
  accounts: AuthState;
  isLoggedIn: boolean;
  login: () => void;
  loginEnterprise: (data: AuthOptions) => void;
  validateToken: (data: AuthTokenOptions) => void;
  logout: () => void;

  notifications: AccountNotifications[];
  isFetching: boolean;
  requestFailed: boolean;
  removeNotificationFromState: (id: string, hostname: string) => void;
  fetchNotifications: () => Promise<void>;
  markNotification: (id: string, hostname: string) => Promise<void>;
  markNotificationDone: (id: string, hostname: string) => Promise<void>;
  unsubscribeNotification: (id: string, hostname: string) => Promise<void>;
  markRepoNotifications: (id: string, hostname: string) => Promise<void>;
  markRepoNotificationsDone: (id: string, hostname: string) => Promise<void>;

  settings: SettingsState;
  updateSetting: (name: keyof SettingsState, value: any) => void;
}

export const AppContext = createContext<Partial<AppContextState>>({});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [accounts, setAccounts] = useState<AuthState>(defaultAccounts);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const {
    fetchNotifications,
    notifications,
    requestFailed,
    isFetching,
    removeNotificationFromState,
    markNotification,
    markNotificationDone,
    unsubscribeNotification,
    markRepoNotifications,
    markRepoNotificationsDone,
  } = useNotifications(settings.colors);

  useEffect(() => {
    restoreSettings();
  }, []);

  useEffect(() => {
    setAppearance(settings.appearance as Appearance);
  }, [settings.appearance]);

  useEffect(() => {
    fetchNotifications(accounts, settings);
  }, [settings.participating]);

  useEffect(() => {
    fetchNotifications(accounts, settings);
  }, [accounts.token, accounts.enterpriseAccounts.length]);

  useInterval(() => {
    fetchNotifications(accounts, settings);
  }, 60000);

  const updateSetting = useCallback(
    (name: keyof SettingsState, value: boolean | Appearance) => {
      if (name === 'openAtStartup') {
        setAutoLaunch(value as boolean);
      }

      const newSettings = { ...settings, [name]: value };
      setSettings(newSettings);
      saveState(accounts, newSettings);
    },
    [accounts, settings],
  );

  const isLoggedIn = useMemo(() => {
    return !!accounts.token || accounts.enterpriseAccounts.length > 0;
  }, [accounts]);

  const login = useCallback(async () => {
    const { authCode } = await authGitHub();
    const { token } = await getToken(authCode);
    const hostname = Constants.DEFAULT_AUTH_OPTIONS.hostname;
    const user = await getUserData(token, hostname);
    const updatedAccounts = addAccount(accounts, token, hostname, user);
    setAccounts(updatedAccounts);
    saveState(updatedAccounts, settings);
  }, [accounts, settings]);

  const loginEnterprise = useCallback(
    async (data: AuthOptions) => {
      const { authOptions, authCode } = await authGitHub(data);
      const { token, hostname } = await getToken(authCode, authOptions);
      const updatedAccounts = addAccount(accounts, token, hostname);
      setAccounts(updatedAccounts);
      saveState(updatedAccounts, settings);
    },
    [accounts, settings],
  );

  const validateToken = useCallback(
    async ({ token, hostname }: AuthTokenOptions) => {
      await apiRequestAuth(
        `${generateGitHubAPIUrl(hostname)}notifications`,
        'HEAD',
        token,
      );
      const user = await getUserData(token, hostname);
      const updatedAccounts = addAccount(accounts, token, hostname, user);
      setAccounts(updatedAccounts);
      saveState(updatedAccounts, settings);
    },
    [accounts, settings],
  );

  const logout = useCallback(() => {
    setAccounts(defaultAccounts);
    clearState();
  }, []);

  const restoreSettings = useCallback(() => {
    const existing = loadState();

    if (existing.accounts) {
      setAccounts({ ...defaultAccounts, ...existing.accounts });
    }

    if (existing.settings) {
      setSettings({ ...defaultSettings, ...existing.settings });
      return existing.settings;
    }
  }, []);

  const fetchNotificationsWithAccounts = useCallback(
    async () => await fetchNotifications(accounts, settings),
    [accounts, settings, notifications],
  );

  const markNotificationWithAccounts = useCallback(
    async (id: string, hostname: string) =>
      await markNotification(accounts, id, hostname),
    [accounts, notifications],
  );

  const markNotificationDoneWithAccounts = useCallback(
    async (id: string, hostname: string) =>
      await markNotificationDone(accounts, id, hostname),
    [accounts, notifications],
  );

  const unsubscribeNotificationWithAccounts = useCallback(
    async (id: string, hostname: string) =>
      await unsubscribeNotification(accounts, id, hostname),
    [accounts, notifications],
  );

  const markRepoNotificationsWithAccounts = useCallback(
    async (repoSlug: string, hostname: string) =>
      await markRepoNotifications(accounts, repoSlug, hostname),
    [accounts, notifications],
  );

  const markRepoNotificationsDoneWithAccounts = useCallback(
    async (repoSlug: string, hostname: string) =>
      await markRepoNotificationsDone(accounts, repoSlug, hostname),
    [accounts, notifications],
  );

  return (
    <AppContext.Provider
      value={{
        accounts,
        isLoggedIn,
        login,
        loginEnterprise,
        validateToken,
        logout,

        notifications,
        isFetching,
        requestFailed,
        removeNotificationFromState,
        fetchNotifications: fetchNotificationsWithAccounts,
        markNotification: markNotificationWithAccounts,
        markNotificationDone: markNotificationDoneWithAccounts,
        unsubscribeNotification: unsubscribeNotificationWithAccounts,
        markRepoNotifications: markRepoNotificationsWithAccounts,
        markRepoNotificationsDone: markRepoNotificationsDoneWithAccounts,

        settings,
        updateSetting,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
