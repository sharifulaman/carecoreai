import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SEED_TAG = "Demo seed: carecore_seed_residents_invoices_v1";

const DEMO_NAMES = [
  { display: "Adam Rahman", initials: "ADRA" },
  { display: "Sami Ahmed", initials: "SAAH" },
  { display: "Yusuf Khan", initials: "YUKH" },
  { display: "Daniel Brooks", initials: "DABR" },
  { display: "Amir Hussain", initials: "AMHU" },
  { display: "Ryan Clarke", initials: "RYCL" },
  { display: "Noah Patel", initials: "NOPA" },
  { display: "Ilyas Ali", initials: "ILAL" },
  { display: "Jayden Morris", initials: "JAMO" },
  { display: "Omar Farooq", initials: "OMFA" },
  { display: "Leo Thompson", initials: "LETH" },
  { display: "Ayaan Malik", initials: "AYMA" },
  { display: "Bilal Chowdhury", initials: "BICH" },
  { display: "Ethan Wilson", initials: "ETWI" },
  { display: "Zakir Hasan", initials: "ZAHA" },
  { display: "Reece Morgan", initials: "REMO" },
];

const LOCAL_AUTHORITIES = [
  "Birmingham City Council", "Manchester City Council", "Leeds City Council",
  "Sheffield City Council", "Tower Hamlets", "Southwark Council",
  "Lambeth Council", "Hackney Council", "Newham Council", "Haringey Council",
];

const SOCIAL_WORKERS = [
  { name: "Sarah Mitchell", email: "s.mitchell@la.gov.uk" },
  { name: "James Okafor", email: "j.okafor@la.gov.uk" },
  { name: "Priya Sharma", email: "p.sharma@la.gov.uk" },
  { name: "Tom Baxter", email: "t.baxter@la.gov.uk" },
  { name: "Aisha Rahman", email: "a.rahman@la.gov.uk" },
];

const MONTHLY_FEE_RANGES = {
  outreach: { min: 2800, max: 4200 },
  eighteen_plus: { min: 3500, max: 5000 },
  twenty_four_hours: { min: 6000, max: 8500 },
};

function homeTypeToServiceType(homeType) {
  if (homeType === "outreach") return "outreach";
  if (homeType === "18_plus") return "eighteen_plus";
  if (homeType === "24_hours") return "twenty_four_hours";
  if (homeType === "care") return "twenty_four_hours";
  return "eighteen_plus";
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function randomDob(serviceType) {
  const age = serviceType === "eighteen_plus" ? randInt(18, 21) : randInt(16, 17);
  const now = new Date();
  const yr = now.getFullYear() - age;
  const mo = String(randInt(1, 12)).padStart(2, "0");
  const dy = String(randInt(1, 28)).padStart(2, "0");
  return `${yr}-${mo}-${dy}`;
}

function firstDayOfMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function lastDayOfMonth(year, month) {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

function invoiceStatus(year, month) {
  const now = new Date();
  const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  if (monthsAgo >= 4) return "paid";
  if (monthsAgo === 3) return "paid";
  if (monthsAgo === 2) return rand(["paid", "paid", "sent"]);
  if (monthsAgo === 1) return rand(["paid", "sent", "overdue"]);
  return rand(["sent", "draft"]);
}

function homeShort(homeName) {
  return (homeName || "HOME").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4).padEnd(4, "X");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin-only function
    if (user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const sr = base44.asServiceRole.entities;
    const warnings = [];
    let residentsCreated = 0;
    let residentsExisting = 0;
    let feesCreated = 0;
    let feesExisting = 0;
    let invoicesCreated = 0;
    let invoicesExisting = 0;
    const months6 = getLast6Months();

    // org_id comes from user.data in this platform
    const orgId = user.data?.org_id || "default_org";
    console.log(`[seed] org_id: ${orgId}, user: ${user.email}, user.data: ${JSON.stringify(user.data)}`);

    console.log("[seed] Loading homes...");
    const allHomes = await sr.Home.filter({ status: "active" });

    if (!allHomes || allHomes.length === 0) {
      return Response.json({
        success: false,
        homes_found: 0,
        warnings: ["No active Home records found."],
      });
    }

    console.log(`[seed] Found ${allHomes.length} homes`);

    // Load existing residents
    const existingResidents = await sr.Resident.filter({ org_id: orgId });
    const residentsByHome = {};
    for (const r of existingResidents) {
      if (!residentsByHome[r.home_id]) residentsByHome[r.home_id] = [];
      residentsByHome[r.home_id].push(r);
    }

    let namePool = [...DEMO_NAMES];
    const allActiveResidents = [];

    // Seed residents
    for (const home of allHomes) {
      const homeOrgId = home.org_id || orgId;
      const serviceType = homeTypeToServiceType(home.type);
      const capacity = home.number_of_beds_capacity || 4;
      const existingActive = (residentsByHome[home.id] || []).filter(r => r.status === "active");
      const target = Math.min(Math.max(2, Math.floor(capacity * 0.75)), 4);
      const needed = Math.max(0, target - existingActive.length);

      for (const r of existingActive) allActiveResidents.push(r);

      console.log(`[seed] Home "${home.name}": ${existingActive.length} existing, need ${needed}`);

      for (let i = 0; i < needed; i++) {
        const taken = existingActive.map(r => r.display_name);
        const available = namePool.filter(n => !taken.includes(n.display));
        if (available.length === 0) {
          warnings.push(`Home "${home.name}": no demo names available`);
          break;
        }
        const nameEntry = rand(available);
        namePool = namePool.filter(n => n.display !== nameEntry.display);
        if (namePool.length === 0) namePool = [...DEMO_NAMES];

        const la = rand(LOCAL_AUTHORITIES);
        const sw = rand(SOCIAL_WORKERS);
        const psDate = new Date();
        psDate.setMonth(psDate.getMonth() - randInt(6, 18));
        const placementStart = psDate.toISOString().split("T")[0];

        const residentData = {
          org_id: orgId,
          home_id: home.id,
          display_name: nameEntry.display,
          full_name: nameEntry.display,
          status: "active",
          service_type: serviceType,
          dob: randomDob(serviceType),
          gender: rand(["male", "male", "female"]),
          nationality: rand(["British", "Somali", "Afghan", "Sudanese", "Pakistani"]),
          placing_local_authority: la,
          social_worker_name: sw.name,
          social_worker_email: sw.email,
          placement_start: placementStart,
          placement_type: serviceType === "twenty_four_hours" ? "childrens_home" : "supported_accommodation",
          risk_level: rand(["low", "medium", "medium", "high"]),
          education_status: rand(["enrolled_college", "enrolled_school", "neet", "training"]),
          looked_after_child: true,
          notes: SEED_TAG,
        };

        try {
          const created = await base44.asServiceRole.entities.Resident.create(residentData);
          allActiveResidents.push(created);
          residentsCreated++;
          console.log(`[seed] Created: ${nameEntry.display} at ${home.name}`);
        } catch (e) {
          warnings.push(`Failed to create ${nameEntry.display}: ${e.message}`);
          console.log(`[seed] Resident create failed: ${e.message}`);
        }
      }
    }

    residentsExisting = allActiveResidents.length - residentsCreated;

    // Load existing fees
    const existingFees = await sr.PlacementFee.filter({ org_id: orgId });
    const feeByResident = {};
    for (const f of existingFees) {
      feeByResident[f.resident_id] = f;
    }

    // Seed placement fees
    for (const resident of allActiveResidents) {
      if (feeByResident[resident.id]) {
        feesExisting++;
        continue;
      }
      const serviceType = resident.service_type || "eighteen_plus";
      const range = MONTHLY_FEE_RANGES[serviceType] || MONTHLY_FEE_RANGES.eighteen_plus;
      const monthlyFee = round2(randInt(range.min, range.max));
      const weeklyRate = round2(monthlyFee * 12 / 52);

      try {
        const fee = await base44.asServiceRole.entities.PlacementFee.create({
          org_id: resident.org_id,
          resident_id: resident.id,
          home_id: resident.home_id,
          local_authority: resident.placing_local_authority || rand(LOCAL_AUTHORITIES),
          weekly_rate: weeklyRate,
          monthly_equivalent: monthlyFee,
          fee_start_date: resident.placement_start || "2024-01-01",
          status: "active",
          created_by: user.email,
          notes: SEED_TAG,
        });
        feeByResident[resident.id] = fee;
        feesCreated++;
      } catch (e) {
        warnings.push(`Fee create failed for ${resident.display_name}: ${e.message}`);
      }
    }

    // Load existing invoices
    const existingInvoices = await sr.PlacementInvoice.filter({ org_id: orgId });
    const invoiceKeys = new Set();
    for (const inv of existingInvoices) {
      if (inv.period_from) {
        const key = `${inv.resident_id}_${inv.period_from.slice(0, 7).replace("-", "")}`;
        invoiceKeys.add(key);
      }
    }

    const monthsSeeded = new Set();

    // Seed invoices
    for (const resident of allActiveResidents) {
      const fee = feeByResident[resident.id];
      if (!fee) {
        warnings.push(`No fee for ${resident.display_name}`);
        continue;
      }

      const home = allHomes.find(h => h.id === resident.home_id);
      const homeCode = homeShort(home ? home.name : "HOME");
      const demoName = DEMO_NAMES.find(n => n.display === resident.display_name);
      const nameCode = demoName ? demoName.initials : resident.display_name.replace(/\s/g, "").toUpperCase().slice(0, 4);

      for (const { year, month } of months6) {
        const yyyymm = `${year}${String(month).padStart(2, "0")}`;
        const dedupeKey = `${resident.id}_${yyyymm}`;

        if (invoiceKeys.has(dedupeKey)) {
          invoicesExisting++;
          continue;
        }

        const daysCount = daysInMonth(year, month);
        const invoiceDate = `${year}-${String(month).padStart(2, "0")}-${String(randInt(1, 5)).padStart(2, "0")}`;
        const dueDate = addDays(invoiceDate, 14);
        const monthlyFee = fee.monthly_equivalent || round2(fee.weekly_rate * 52 / 12);
        const dailyRate = round2(monthlyFee * 12 / 365);
        const amountDue = round2(dailyRate * daysCount);
        const status = invoiceStatus(year, month);
        const seqNum = String(invoicesCreated + 1).padStart(3, "0");
        const invoiceNumber = `CCAI-${yyyymm}-${homeCode}-${nameCode}-${seqNum}`;

        const invoiceData = {
          org_id: resident.org_id,
          placement_fee_id: fee.id,
          resident_id: resident.id,
          home_id: resident.home_id,
          local_authority: fee.local_authority || rand(LOCAL_AUTHORITIES),
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          period_from: firstDayOfMonth(year, month),
          period_to: lastDayOfMonth(year, month),
          days_in_period: daysCount,
          daily_rate: dailyRate,
          amount_due: amountDue,
          total_amount: amountDue,
          status,
          generated_by: user.email,
          notes: SEED_TAG,
        };

        if (status === "paid") {
          invoiceData.paid_date = addDays(dueDate, randInt(-5, 10));
          invoiceData.sent_date = addDays(invoiceDate, 1);
          invoiceData.payment_reference = `REF-${yyyymm}-${randInt(10000, 99999)}`;
        } else if (status === "sent") {
          invoiceData.sent_date = addDays(invoiceDate, 1);
        }

        try {
          await base44.asServiceRole.entities.PlacementInvoice.create(invoiceData);
          invoiceKeys.add(dedupeKey);
          invoicesCreated++;
          monthsSeeded.add(`${year}-${String(month).padStart(2, "0")}`);
        } catch (e) {
          warnings.push(`Invoice create failed for ${resident.display_name} ${yyyymm}: ${e.message}`);
        }
      }
    }

    const summary = {
      success: true,
      homes_found: allHomes.length,
      residents_created: residentsCreated,
      residents_existing: residentsExisting,
      total_active_residents: allActiveResidents.length,
      placement_fees_created: feesCreated,
      placement_fees_existing: feesExisting,
      invoices_created: invoicesCreated,
      invoices_existing: invoicesExisting,
      months_seeded: [...monthsSeeded],
      warnings,
    };

    console.log("[seed] Done:", JSON.stringify(summary));
    return Response.json(summary);

  } catch (err) {
    console.error("[seed] Error:", err.message);
    return Response.json({ error: err.message, success: false }, { status: 500 });
  }
});