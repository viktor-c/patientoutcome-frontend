import { Configuration, UserApi, FormApi, PatientApi, PatientCaseApi, ConsultationApi, CodeApi, FormtemplateApi, KioskApi, SurgeryApi, BlueprintApi, StatisticsApi, FeedbackApi, UserDepartmentApi, BackupApi, SettingsApi } from '@/api/';
import { authMiddleware } from '@/middleware/authMiddleware';

// Create a new configuration with a custom basePath and auth middleware
// In dev, prefer the local proxy path (`/api`) so requests are same-origin and cookies work
const defaultBase = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || '/api')
  : (import.meta.env.VITE_API_URL || 'https://prom.example.com');

const apiConfig = new Configuration({
  basePath: defaultBase,
  credentials: "include",
  middleware: [authMiddleware]
});
console.debug("API Base Path:", apiConfig.basePath);
// Create API instances with the custom configuration
export const userApi = new UserApi(apiConfig)
export const patientApi = new PatientApi(apiConfig) // Assuming you have a PatientApi similar to UserApi
export const formApi = new FormApi(apiConfig)
export const consultationApi = new ConsultationApi(apiConfig)
export const codeApi = new CodeApi(apiConfig)
export const patientCaseApi = new PatientCaseApi(apiConfig) // Assuming you have a PatientCaseApi similar to UserApi
export const formtemplateApi = new FormtemplateApi(apiConfig)
export const kioskApi = new KioskApi(apiConfig)
export const surgeryApi = new SurgeryApi(apiConfig)
export const blueprintApi = new BlueprintApi(apiConfig)
export const statisticsApi = new StatisticsApi(apiConfig)
export const feedbackApi = new FeedbackApi(apiConfig)
export const userDepartmentApi = new UserDepartmentApi(apiConfig)
export const backupApi = new BackupApi(apiConfig)
export const settingsApi = new SettingsApi(apiConfig)

export * from '@/api/index'; // Export all APIs and models from the index file

/**
 * Admin helper to update a user by username by calling the API path that includes the username.
 * Fallback for cases where the standard update endpoint updates the current session user.
 */
export async function updateUserByUsername(username: string, payload: object) {
  const base = apiConfig.basePath ?? '';
  const url = `${base.replace(/\/$/, '')}/user/username/${encodeURIComponent(username)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update user by username: ${res.status} ${res.statusText}: ${text}`);
  }
  return await res.json();
}
