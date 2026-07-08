import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const FAKE_BILL_IMAGES = [
  "https://images.unsplash.com/photo-1554321586-fcdbb66d1c18?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554320291-cdba5b45bbeb?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554322876-cd4628902c4d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554321585-2b9db0e6c0d5?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554321584-da166d7d9d8e?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1554325640-26d4e4ea0c46?w=600&h=400&fit=crop",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all homes
    const homes = await base44.entities.Home.filter({ status: "active" });
    if (homes.length === 0) {
      return Response.json({ error: "No active homes found" }, { status: 400 });
    }

    // Create 5-6 fake bills
    const today = new Date();
    const fakeBills = [
      {
        org_id: user.org_id,
        home_id: homes[0]?.id,
        home_name: homes[0]?.name,
        bill_type: "utilities",
        supplier: "British Gas",
        amount: 245.50,
        due_date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split("T")[0],
        status: "pending",
        is_direct_debit: true,
        is_recurring: true,
        notes: "Monthly gas and electricity bill",
        image_url: FAKE_BILL_IMAGES[0],
        image_file_name: "british_gas_bill.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
      {
        org_id: user.org_id,
        home_id: homes[Math.min(1, homes.length - 1)]?.id,
        home_name: homes[Math.min(1, homes.length - 1)]?.name,
        bill_type: "council_tax",
        supplier: "Local Council",
        amount: 1250.00,
        due_date: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0],
        status: "overdue",
        is_direct_debit: true,
        is_recurring: true,
        notes: "Council tax for property",
        image_url: FAKE_BILL_IMAGES[1],
        image_file_name: "council_tax.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
      {
        org_id: user.org_id,
        home_id: homes[0]?.id,
        home_name: homes[0]?.name,
        bill_type: "insurance",
        supplier: "Direct Line",
        amount: 560.00,
        due_date: new Date(today.getFullYear(), today.getMonth() + 1, 20).toISOString().split("T")[0],
        status: "pending",
        is_direct_debit: false,
        is_recurring: true,
        notes: "Buildings and contents insurance",
        image_url: FAKE_BILL_IMAGES[2],
        image_file_name: "insurance_bill.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
      {
        org_id: user.org_id,
        home_id: homes[Math.min(2, homes.length - 1)]?.id,
        home_name: homes[Math.min(2, homes.length - 1)]?.name,
        bill_type: "maintenance",
        supplier: "ABC Cleaning Services",
        amount: 150.00,
        due_date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split("T")[0],
        status: "paid",
        is_direct_debit: false,
        is_recurring: false,
        paid_date: new Date(today.getFullYear(), today.getMonth(), 8).toISOString().split("T")[0],
        notes: "Professional cleaning service",
        image_url: FAKE_BILL_IMAGES[3],
        image_file_name: "cleaning_invoice.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
      {
        org_id: user.org_id,
        home_id: homes[0]?.id,
        home_name: homes[0]?.name,
        bill_type: "rent",
        supplier: "Property Management Ltd",
        amount: 3500.00,
        due_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
        status: "paid",
        is_direct_debit: true,
        is_recurring: true,
        paid_date: new Date(today.getFullYear(), today.getMonth() - 1, 30).toISOString().split("T")[0],
        notes: "Monthly rental payment",
        image_url: FAKE_BILL_IMAGES[4],
        image_file_name: "rent_receipt.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
      {
        org_id: user.org_id,
        home_id: homes[Math.min(1, homes.length - 1)]?.id,
        home_name: homes[Math.min(1, homes.length - 1)]?.name,
        bill_type: "utilities",
        supplier: "Water Company",
        amount: 89.50,
        due_date: new Date(today.getFullYear(), today.getMonth() - 2, 25).toISOString().split("T")[0],
        status: "overdue",
        is_direct_debit: true,
        is_recurring: true,
        notes: "Water and sewerage charges",
        image_url: FAKE_BILL_IMAGES[5],
        image_file_name: "water_bill.jpg",
        image_uploaded_at: new Date().toISOString(),
      },
    ];

    // Create all bills
    const createdBills = await base44.entities.Bill.bulkCreate(fakeBills);

    return Response.json({
      success: true,
      message: `Created ${createdBills.length} fake bills with images`,
      bills: createdBills,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});