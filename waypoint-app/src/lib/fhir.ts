/**
 * FHIR / Epic MyChart integration — SMART on FHIR patient-facing OAuth
 * Phase 11: Sprints S77–S80
 *
 * Handles OAuth flow, token management, and FHIR R4 resource fetching
 * for conditions, medications, appointments, allergies, and labs.
 *
 * NOTE: This phase is conditional on securing a health system partnership.
 * Sandbox development is free; production requires $15K-$200K+ per health system.
 */

import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// ─── Config ─────────────────────────────────────────────────────────────────

const FHIR_TOKEN_KEY = 'waypoint_fhir_access_token';
const FHIR_REFRESH_KEY = 'waypoint_fhir_refresh_token';
const FHIR_SERVER_KEY = 'waypoint_fhir_server_url';
const FHIR_PATIENT_KEY = 'waypoint_fhir_patient_id';

// Default to Epic sandbox — production URLs configured per health system
const DEFAULT_FHIR_SERVER = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
const DEFAULT_AUTH_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize';
const DEFAULT_TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';

// SMART on FHIR scopes for patient-facing app
const FHIR_SCOPES = [
  'patient/Condition.read',
  'patient/MedicationRequest.read',
  'patient/Appointment.read',
  'patient/AllergyIntolerance.read',
  'patient/Observation.read',
  'patient/DocumentReference.read',
  'launch/patient',
  'openid',
  'fhirUser',
].join(' ');

const CLIENT_ID = process.env.EXPO_PUBLIC_FHIR_CLIENT_ID ?? '';
const REDIRECT_URI = Linking.createURL('fhir-callback');

// ─── FHIR Resource Types ────────────────────────────────────────────────────

export interface FHIRCondition {
  id: string;
  code: { text: string; coding?: Array<{ system: string; code: string; display: string }> };
  clinicalStatus?: { coding?: Array<{ code: string }> };
  onsetDateTime?: string;
  recordedDate?: string;
}

export interface FHIRMedication {
  id: string;
  medicationCodeableConcept?: { text: string };
  status: string;
  dosageInstruction?: Array<{ text: string }>;
  authoredOn?: string;
}

export interface FHIRAppointment {
  id: string;
  status: string;
  start: string;
  end?: string;
  description?: string;
  participant?: Array<{ actor?: { display: string } }>;
}

export interface FHIRAllergy {
  id: string;
  code: { text: string };
  clinicalStatus?: { coding?: Array<{ code: string }> };
  type?: string;
  criticality?: string;
  reaction?: Array<{ manifestation: Array<{ text: string }> }>;
}

export interface FHIRObservation {
  id: string;
  code: { text: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit: string };
  valueString?: string;
  status: string;
  referenceRange?: Array<{ low?: { value: number; unit: string }; high?: { value: number; unit: string } }>;
}

// ─── OAuth Flow (S77) ───────────────────────────────────────────────────────

/**
 * Initiate SMART on FHIR OAuth flow.
 * Opens MyChart login in a web browser, handles redirect.
 */
export async function connectMyChart(): Promise<{ success: boolean; error?: string }> {
  try {
    const authUrl = `${DEFAULT_AUTH_URL}?` + new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: FHIR_SCOPES,
      aud: DEFAULT_FHIR_SERVER,
    }).toString();

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== 'success' || !result.url) {
      return { success: false, error: 'Authentication cancelled' };
    }

    // Extract authorization code from redirect URL
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return { success: false, error: 'No authorization code received' };
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(DEFAULT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      return { success: false, error: 'Token exchange failed' };
    }

    const tokenData = await tokenResponse.json();

    // Store tokens securely
    await SecureStore.setItemAsync(FHIR_TOKEN_KEY, tokenData.access_token);
    if (tokenData.refresh_token) {
      await SecureStore.setItemAsync(FHIR_REFRESH_KEY, tokenData.refresh_token);
    }
    if (tokenData.patient) {
      await SecureStore.setItemAsync(FHIR_PATIENT_KEY, tokenData.patient);
    }
    await SecureStore.setItemAsync(FHIR_SERVER_KEY, DEFAULT_FHIR_SERVER);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Disconnect MyChart — revoke tokens and clear stored data.
 */
export async function disconnectMyChart(): Promise<void> {
  await SecureStore.deleteItemAsync(FHIR_TOKEN_KEY);
  await SecureStore.deleteItemAsync(FHIR_REFRESH_KEY);
  await SecureStore.deleteItemAsync(FHIR_SERVER_KEY);
  await SecureStore.deleteItemAsync(FHIR_PATIENT_KEY);
}

/**
 * Check if MyChart is connected.
 */
export async function isMyChartConnected(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(FHIR_TOKEN_KEY);
  return !!token;
}

// ─── Authenticated FHIR Fetch ───────────────────────────────────────────────

async function fhirFetch(resourcePath: string): Promise<Record<string, unknown>> {
  const token = await SecureStore.getItemAsync(FHIR_TOKEN_KEY);
  const server = await SecureStore.getItemAsync(FHIR_SERVER_KEY);
  if (!token || !server) throw new Error('MyChart not connected');

  const response = await fetch(`${server}/${resourcePath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/fhir+json',
    },
  });

  if (response.status === 401) {
    // Try refresh
    const refreshed = await refreshFHIRToken();
    if (!refreshed) throw new Error('MyChart session expired. Please reconnect.');

    const retryResponse = await fetch(`${server}/${resourcePath}`, {
      headers: {
        Authorization: `Bearer ${refreshed}`,
        Accept: 'application/fhir+json',
      },
    });
    if (!retryResponse.ok) throw new Error(`FHIR error: ${retryResponse.status}`);
    return retryResponse.json();
  }

  if (!response.ok) throw new Error(`FHIR error: ${response.status}`);
  return response.json();
}

async function refreshFHIRToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(FHIR_REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(DEFAULT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }).toString(),
    });

    if (!response.ok) return null;
    const data = await response.json();
    await SecureStore.setItemAsync(FHIR_TOKEN_KEY, data.access_token);
    if (data.refresh_token) {
      await SecureStore.setItemAsync(FHIR_REFRESH_KEY, data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

// ─── FHIR Resource Fetchers (S78-S80) ───────────────────────────────────────

/** S78: Fetch conditions (diagnoses) */
export async function fetchConditions(): Promise<FHIRCondition[]> {
  const patientId = await SecureStore.getItemAsync(FHIR_PATIENT_KEY);
  if (!patientId) return [];

  const bundle = await fhirFetch(`Condition?patient=${patientId}&clinical-status=active`);
  const entries = (bundle.entry as Array<{ resource: FHIRCondition }>) ?? [];
  return entries.map((e) => e.resource);
}

/** S78: Fetch active medications */
export async function fetchMedications(): Promise<FHIRMedication[]> {
  const patientId = await SecureStore.getItemAsync(FHIR_PATIENT_KEY);
  if (!patientId) return [];

  const bundle = await fhirFetch(`MedicationRequest?patient=${patientId}&status=active`);
  const entries = (bundle.entry as Array<{ resource: FHIRMedication }>) ?? [];
  return entries.map((e) => e.resource);
}

/** S79: Fetch upcoming appointments */
export async function fetchFHIRAppointments(): Promise<FHIRAppointment[]> {
  const patientId = await SecureStore.getItemAsync(FHIR_PATIENT_KEY);
  if (!patientId) return [];

  const now = new Date().toISOString();
  const bundle = await fhirFetch(`Appointment?patient=${patientId}&date=ge${now}&status=booked,arrived,fulfilled`);
  const entries = (bundle.entry as Array<{ resource: FHIRAppointment }>) ?? [];
  return entries.map((e) => e.resource);
}

/** S79: Fetch allergies */
export async function fetchAllergies(): Promise<FHIRAllergy[]> {
  const patientId = await SecureStore.getItemAsync(FHIR_PATIENT_KEY);
  if (!patientId) return [];

  const bundle = await fhirFetch(`AllergyIntolerance?patient=${patientId}&clinical-status=active`);
  const entries = (bundle.entry as Array<{ resource: FHIRAllergy }>) ?? [];
  return entries.map((e) => e.resource);
}

/** S80: Fetch lab results */
export async function fetchLabResults(): Promise<FHIRObservation[]> {
  const patientId = await SecureStore.getItemAsync(FHIR_PATIENT_KEY);
  if (!patientId) return [];

  const bundle = await fhirFetch(`Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=50`);
  const entries = (bundle.entry as Array<{ resource: FHIRObservation }>) ?? [];
  return entries.map((e) => e.resource);
}

// ─── Health Summary for AI Navigator (S81) ──────────────────────────────────

export interface HealthSummary {
  conditions: string[];
  medications: string[];
  allergies: string[];
  recentLabs: string[];
  upcomingAppointments: string[];
}

/**
 * Build a health summary string for injection into the AI Navigator system prompt.
 * Returns null if MyChart is not connected.
 */
export async function buildHealthSummary(): Promise<HealthSummary | null> {
  const connected = await isMyChartConnected();
  if (!connected) return null;

  try {
    const [conditions, meds, allergies, labs, appts] = await Promise.all([
      fetchConditions(),
      fetchMedications(),
      fetchAllergies(),
      fetchLabResults(),
      fetchFHIRAppointments(),
    ]);

    return {
      conditions: conditions.map((c) => c.code.text),
      medications: meds.map((m) => m.medicationCodeableConcept?.text ?? 'Unknown medication'),
      allergies: allergies.map((a) => a.code.text),
      recentLabs: labs.slice(0, 10).map((l) => {
        const value = l.valueQuantity ? `${l.valueQuantity.value} ${l.valueQuantity.unit}` : l.valueString ?? 'N/A';
        return `${l.code.text}: ${value} (${l.effectiveDateTime?.split('T')[0] ?? 'unknown date'})`;
      }),
      upcomingAppointments: appts.slice(0, 5).map((a) => {
        const provider = a.participant?.[0]?.actor?.display ?? 'Unknown';
        return `${a.description ?? 'Appointment'} with ${provider} on ${a.start.split('T')[0]}`;
      }),
    };
  } catch {
    return null;
  }
}

/**
 * Format health summary as text for AI system prompt injection.
 */
export function formatHealthSummaryForAI(summary: HealthSummary): string {
  const sections: string[] = [];

  if (summary.conditions.length > 0) {
    sections.push(`Medical Conditions: ${summary.conditions.join(', ')}`);
  }
  if (summary.medications.length > 0) {
    sections.push(`Active Medications: ${summary.medications.join(', ')}`);
  }
  if (summary.allergies.length > 0) {
    sections.push(`Allergies: ${summary.allergies.join(', ')}`);
  }
  if (summary.recentLabs.length > 0) {
    sections.push(`Recent Labs:\n${summary.recentLabs.map((l) => `  - ${l}`).join('\n')}`);
  }
  if (summary.upcomingAppointments.length > 0) {
    sections.push(`Upcoming Appointments:\n${summary.upcomingAppointments.map((a) => `  - ${a}`).join('\n')}`);
  }

  if (sections.length === 0) return '';

  return `## MyChart Health Data (Patient Authorized)
The following health data was authorized by the parent via MyChart:

${sections.join('\n\n')}

IMPORTANT: This is real medical data. Reference it when relevant but maintain your role as a disability services navigator, not a medical advisor. For medical questions, recommend consulting the child's physician.`;
}
