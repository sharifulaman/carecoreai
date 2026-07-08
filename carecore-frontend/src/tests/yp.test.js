import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome} from "@/tests/getHome";
import {getKeyWorker} from "@/tests/getKeyWorker";
import {getTeamLeaderID} from "@/tests/getTeamLeaderID";
import {getToken} from "@/tests/getToken";
import { getTeamLeaderID } from "./getTeamLeaderID";
import {secureGateway} from "@/lib/secureGateway";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const gender = [
    "male",
    "female",
    "non-binary",
    "prefer not to say"
];
const serviceType = [
    "outreach",
    "18+ accomodation",
    "24 hours housing"
];

const placement_type = [
    "children's home",
    "supported accomodation",
    "adult care"
];
const payload = {
    display_name: "Test display name",
    initials: "test initials",
    dob: new Date("2020-05-12T11:56:34Z"),
    gender: gender[2],
    nationality: "bangladeshi",
    home_id: "",
    key_worker_id: "",
    team_leader_id: "",
    placement_type: placement_type[1],
    placement_start: new Date("2026-06-24T17:56:34Z"),
    risk_level: "low",
    status: "active",
    org_id: "",
    social_worker_name: "test worker",
    social_worker_org: "test worker organization",
    iro_name: "test iro name",
    health_notes: "test health notes",
    service_type:  serviceType[2],
    accommodation_category: "test accomodation category",
    looked_after_child: true,
    care_leaver_status: true,
    legal_placement_basis: "test legal placement basis",
    placing_local_authority: "test local authority",
    uasc: true,
    english_first_language: true,
    first_language: "english",
    interpreter_required: false,
    annex_a_applicable: false,
    annex_a_override: false,
  }

  beforeEach(() => {
    global.sessionStorage = {
        _data:{},
        getItem(key){return this._data[key] || null},
        setItem(key, value){this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe("Add a young people", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            });
            base44.setToken(token);
           
        }
    )
    it("Posting to backend", async() => {
        const homeID = await getHome();
        let keyWorkerID = await getKeyWorker();
        keyWorkerID = keyWorkerID.id;
        const teamLeaderID = await getTeamLeaderID();
        payload.home_id = homeID;
        payload.key_worker_id = keyWorkerID;
        payload.team_leader_id = teamLeaderID;

        const data = await secureGateway.create("Resident", payload);
        console.log("Response: ", data)
        expect(data.home_id).toBe(homeID);
        expect(data.key_worker_id).toBe(keyWorkerID);
        expect(data.team_leader_id).toBe(teamLeaderID)

    })
})