// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { signIn } from './signIn'

// sessionStorage doesn't exist in plain Node — polyfill a minimal version for this test file only
beforeEach(() => {
  global.sessionStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null },
    setItem(key, value) { this._data[key] = value },
    removeItem(key) { delete this._data[key] },
    clear() { this._data = {} },
  }
})

const TEST_EMAIL = "admin@test.com"
const TEST_PASSWORD = "SafePassword123@"

describe('sign in (integration, hits local backend)', () => {
  afterEach(() => {
    sessionStorage.clear()
  })
  const testCases = [
    {
      iEmail:"test99@sl.com",
      iPassword:"12345678"
    },
    {
      iEmail:"test98@sl.com",
      iPassword:"12345678"
    }
  ];
   const testCasesInvalid = [
    {
      iEmail:"test99@sl.com",
      iPassword:"12345678d"
    },
    {
      iEmail:"test98@sl.com",
      iPassword:"12345678d"
    }
  ];
  const testCasesWithIndex = testCases.map((data, index) => ({ ...data, index }));
  it.each(testCasesWithIndex)(
   'Log in successfully with valid credentials, case $index',
    async({iEmail, iPassword}) => {
      const result = await signIn(
        {
          email:iEmail,
          password:iPassword,
          checkUserAuth: async () => {},
        }
      )
      
    expect(result.success).toBe(true)
    expect(result.target).toBeTruthy()
    expect(sessionStorage.getItem('access_token')).toBeTruthy()
    expect(sessionStorage.getItem('token')).toBeTruthy()
    expect(JSON.parse(sessionStorage.getItem('user'))).toHaveProperty('role')
    }
  )
 
const testCasesInvalidWithIndex = testCasesInvalid.map((data, index) => ({...data, index}));
it.each(testCasesInvalidWithIndex)(
  'Log in failed with invalid credentials, case $index',
  async({iEmail, iPassword})=> {
    const result = await signIn({
      email:iEmail,
      password:iPassword,
      checkUserAuth: async() => {},
    })
       expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(sessionStorage.getItem('access_token')).toBeNull()
  }
)
 
})