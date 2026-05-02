const HUBSPOT_API_TOKEN = process.env.HUBSPOT_API_TOKEN
const HUBSPOT_API_BASE_URL = process.env.HUBSPOT_API_BASE_URL || "https://api.hubapi.com"

if (!HUBSPOT_API_TOKEN) {
  throw new Error("HUBSPOT_API_TOKEN is required for HubSpot integration")
}

const hubspotHeaders = {
  Authorization: `Bearer ${HUBSPOT_API_TOKEN}`,
  "Content-Type": "application/json",
}

async function hubspotFetch(path: string, options: RequestInit) {
  const response = await fetch(`${HUBSPOT_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...hubspotHeaders,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HubSpot API error ${response.status}: ${errorText}`)
  }

  return response.json()
}

interface HubSpotContactProperties {
  email: string
  firstname?: string
  lastname?: string
  name?: string
  phone?: string
  company?: string
  city?: string
  description?: string
  lifecyclestage?: string
  fitness_goals?: string
  fitness_level?: string
  trust_score?: string | number
}

export async function findContactByEmail(email: string) {
  const body = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "EQ",
            value: email,
          },
        ],
      },
    ],
    properties: ["email"],
    limit: 1,
  }

  const result = await hubspotFetch("/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify(body),
  })

  return Array.isArray(result.results) && result.results.length > 0
    ? result.results[0].id
    : null
}

export async function createContact(properties: HubSpotContactProperties) {
  return hubspotFetch("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  })
}

export async function updateContact(contactId: string, properties: HubSpotContactProperties) {
  return hubspotFetch(`/crm/v3/objects/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  })
}

export async function upsertContact(properties: HubSpotContactProperties) {
  const contactId = await findContactByEmail(properties.email)

  if (contactId) {
    return updateContact(contactId, properties)
  }

  return createContact(properties)
}
