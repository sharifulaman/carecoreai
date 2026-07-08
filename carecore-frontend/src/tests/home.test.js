// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { getToken } from "@/tests/getToken"
import { getTeamLeaderID } from './getTeamLeaderID';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');


beforeEach(() => {
  global.sessionStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null },
    setItem(key, value) { this._data[key] = value },
    removeItem(key) { delete this._data[key] },
    clear() { this._data = {} },
  }
})

describe("AddHomeModal - handleSubmit integration test", () => {
  let token;

  beforeAll(async () => {
    token = await getToken({
      email: import.meta.env.VITE_EMAIL,
      password: import.meta.env.VITE_PASSWORD
    })
    
  })

  it("should create a home with all fields", async () => {
    // This replicates exactly what handleSubmit does
    const formData = {
      org_id: "default_org",
      name: "Test Home " + Date.now(), 
      type: "outreach",
      address: "123 Test Street",
      postcode: "SW1A1AA",
      phone: "0207123456",
      email: "testhome@example.com",
      team_leader_id: "111", 
      monthly_rent: 1500.00,
      landlord_name: "Test Landlord",
      landlord_contact: "07700900000",
      landlord_email: "landlord@example.com",
      lease_start: new Date("2024-06-01T00:00:00Z").toISOString(),
      lease_end: new Date("2025-06-01T00:00:00Z").toISOString(),
      property_notes: "Test property notes",
      documents: [
        {
          document_type: "gas_safety",
          doc_type: "gas_safety",
          category: "Compliance",
          doc_category: "Compliance",
          title: "Gas Safety Certificate - TEST123",
          reference: "TEST123",
          details: "Annual gas safety check",
          file_name: "gas_cert.pdf",
          file_url: "https://example.com/files/gas_cert.pdf",
          key: "home/home_documents/Test Home/gas_cert.pdf",
          file_size: 102400,
          content_type: "application/pdf",
          expiry_date: new Date("2025-06-01").toISOString(),
          created_by: "test-user-id",
          created_by_name: "Admin User",
          uploaded_by: "test-user-id",
          uploaded_by_name: "Admin User"
        },
        {
          document_type: "insurance",
          doc_type: "insurance",
          category: "Important Documents",
          doc_category: "Important Documents",
          title: "Building Insurance Policy",
          reference: "INS-2024-001",
          details: "Annual building insurance",
          file_name: "insurance.pdf",
          file_url: "https://example.com/files/insurance.pdf",
          key: "home/home_documents/Test Home/insurance.pdf",
          file_size: 204800,
          content_type: "application/pdf",
          expiry_date: new Date("2025-01-01").toISOString(),
          created_by: "test-user-id",
          created_by_name: "Admin User",
          uploaded_by: "test-user-id",
          uploaded_by_name: "Admin User"
        }
      ]
    };

  
    
    const response = await fetch(`${API_BASE}/entities/Home`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    const responseData = await response.json()
    
    
    expect(responseData.data.name).toBe(formData.name)
    expect(responseData.data.documents[0].category).toBe(formData.documents[0].category)
  })
  it("Creating a home while fetching a team leader from backend", async () => {
      const response = await fetch(`${API_BASE}/entities/StaffProfile?status=active&role=team_leader`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();



const tIDTwo = await getTeamLeaderID();


const formData = {
      org_id: "default_org",
      name: "Test Home " + Date.now(), 
      type: "outreach",
      address: "123 Test Street",
      postcode: "SW1A1AA",
      phone: "0207123456",
      email: "testhome@example.com",
      team_leader_id: tIDTwo, 
      monthly_rent: 1500.00,
      landlord_name: "Test Landlord",
      landlord_contact: "07700900000",
      landlord_email: "landlord@example.com",
      lease_start: new Date("2024-06-01T00:00:00Z").toISOString(),
      lease_end: new Date("2025-06-01T00:00:00Z").toISOString(),
      property_notes: "Test property notes",
      documents: [
        {
          document_type: "gas_safety",
          doc_type: "gas_safety",
          category: "Compliance",
          doc_category: "Compliance",
          title: "Gas Safety Certificate - TEST123",
          reference: "TEST123",
          details: "Annual gas safety check",
          file_name: "gas_cert.pdf",
          file_url: "https://example.com/files/gas_cert.pdf",
          key: "home/home_documents/Test Home/gas_cert.pdf",
          file_size: 102400,
          content_type: "application/pdf",
          expiry_date: new Date("2025-06-01").toISOString(),
          created_by: "test-user-id",
          created_by_name: "Admin User",
          uploaded_by: "test-user-id",
          uploaded_by_name: "Admin User"
        },
        {
          document_type: "insurance",
          doc_type: "insurance",
          category: "Important Documents",
          doc_category: "Important Documents",
          title: "Building Insurance Policy",
          reference: "INS-2024-001",
          details: "Annual building insurance",
          file_name: "insurance.pdf",
          file_url: "https://example.com/files/insurance.pdf",
          key: "home/home_documents/Test Home/insurance.pdf",
          file_size: 204800,
          content_type: "application/pdf",
          expiry_date: new Date("2025-01-01").toISOString(),
          created_by: "test-user-id",
          created_by_name: "Admin User",
          uploaded_by: "test-user-id",
          uploaded_by_name: "Admin User"
        }
      ]
    };

  
    
    const responseTwo = await fetch(`${API_BASE}/entities/Home`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    const responseDataTwo = await responseTwo.json()
    
    expect(responseDataTwo.data.team_leader_id).toBe(tIDTwo)
   

  })
})