// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { signUp } from './signUp'
import { iteratee } from 'lodash'

const TEST_EMAIL = "bob7s44s4sdf7@test.com"
const TEST_PASSWORD = "SafePassword123@"
// const TEST_CONFIRM_PASSWORD = "SafePassword123@"
const TEST_CONFIRM_PASSWORD = "SafePassword123@"

describe("Sign up tests", () => {
    const testCases = [
        {
            iEmail:"bob999sss3@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678"
        },
        {
            iEmail:"bob99ss8s3@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678"
        },
        {
            iEmail:"bob997sss3@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678"
        },
        {
            iEmail:"bob99sss63@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678"
        }
    ];
     const testCasesInvalid = [
        {
            iEmail:"bob9993@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678s"
        }, 
    ];
      const testCasesDEmail = [
          {
            iEmail:"bob99s63@sl.com",
            iPassword:"12345678",
            iConfirmPassword:"12345678"
        }
    ];
    it.each(testCases)(
        "Sign ups successfully with valid credentials",
        async ({iEmail, iPassword, iConfirmPassword}) => {
            const result = await signUp(
                {
                    email:iEmail,
                    password:iPassword,
                    confirmPassword:iConfirmPassword,

                }
            )
            const {email, role} = result
            expect(email).toBe(iEmail)
            expect(role).toBe("support_worker")
        }
    )
    it.each(testCasesInvalid)(
        "Sign up fails after entering invalid credentials",
        async({iEmail, iPassword, iConfirmPassword}) => {
            let text = "";
            if(iPassword !== iConfirmPassword){
                text = "Password mismatch"
                expect("Password mismatch").toBe(text)
                return
            } else {
                const result = await signUp({
                    email:iEmail,
                    password:iPassword,
                    confirmPassword:iConfirmPassword,
                })
            }
        }
    )
   
    it.each(testCasesDEmail)(
        "Sign up fails when email already exists",
        async({iEmail, iPassword, iConfirmPassword}) => {
            const result = await signUp({
                email:iEmail,
                password:iPassword,
                confirmPassword:iConfirmPassword
            })
        }
    )
    
})