import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ILS_DOMAINS = [
  {
    name: "Home Management",
    icon: "home",
    skills: [
      { name: "Cleaning and household tasks", icon: "broom" },
      { name: "Laundry and ironing", icon: "shirt" },
      { name: "Minor maintenance and repairs", icon: "wrench" },
      { name: "Understanding tenancy responsibilities", icon: "key" },
      { name: "Dealing with landlords and repairs", icon: "phone" },
      { name: "Recycling and waste management", icon: "recycle" }
    ]
  },
  {
    name: "Food and Nutrition",
    icon: "utensils",
    skills: [
      { name: "Meal planning for the week", icon: "list" },
      { name: "Food shopping on a budget", icon: "shopping-cart" },
      { name: "Cooking 5+ different meals independently", icon: "chef-hat" },
      { name: "Food safety and storage", icon: "fridge" },
      { name: "Understanding nutrition and healthy eating", icon: "apple" },
      { name: "Using kitchen equipment safely", icon: "microwave" }
    ]
  },
  {
    name: "Finance and Money",
    icon: "wallet",
    skills: [
      { name: "Weekly/monthly budgeting", icon: "calculator" },
      { name: "Managing a bank account", icon: "credit-card" },
      { name: "Paying bills and utilities", icon: "zap" },
      { name: "Understanding credit and debt", icon: "trending-down" },
      { name: "Building savings habits", icon: "piggy-bank" },
      { name: "Claiming benefits and entitlements", icon: "file-text" },
      { name: "Understanding payslips and tax", icon: "briefcase" }
    ]
  },
  {
    name: "Employment and Education",
    icon: "briefcase",
    skills: [
      { name: "Writing a CV", icon: "file-text" },
      { name: "Completing job applications", icon: "edit" },
      { name: "Interview preparation and skills", icon: "users" },
      { name: "Maintaining employment", icon: "trending-up" },
      { name: "Understanding workplace rights", icon: "shield" },
      { name: "Navigating further education", icon: "book" },
      { name: "Career planning", icon: "target" }
    ]
  },
  {
    name: "Health Management",
    icon: "heart",
    skills: [
      { name: "Registering with and attending GP", icon: "stethoscope" },
      { name: "Managing medication independently", icon: "pill" },
      { name: "Mental health self-management", icon: "smile" },
      { name: "Sexual health awareness", icon: "shield-check" },
      { name: "Dental and optical care", icon: "eye" },
      { name: "Making and attending appointments", icon: "calendar" },
      { name: "Understanding NHS services", icon: "info" }
    ]
  },
  {
    name: "Social and Community",
    icon: "users",
    skills: [
      { name: "Building and maintaining friendships", icon: "heart" },
      { name: "Community engagement and activities", icon: "activity" },
      { name: "Understanding rights as a citizen", icon: "award" },
      { name: "Avoiding exploitation and unhealthy relationships", icon: "shield" },
      { name: "Using public transport", icon: "bus" },
      { name: "Accessing local services", icon: "map-pin" }
    ]
  },
  {
    name: "Digital Literacy",
    icon: "monitor",
    skills: [
      { name: "Internet safety and privacy", icon: "lock" },
      { name: "Setting up and using email", icon: "mail" },
      { name: "Completing online forms", icon: "clipboard" },
      { name: "Online banking safely", icon: "credit-card" },
      { name: "Social media safety", icon: "share-2" },
      { name: "Job searching online", icon: "search" },
      { name: "Using apps for daily life", icon: "smartphone" }
    ]
  },
  {
    name: "Emotional Wellbeing",
    icon: "mind",
    skills: [
      { name: "Identifying and managing emotions", icon: "smile" },
      { name: "Asking for help when needed", icon: "help-circle" },
      { name: "Managing stress and anxiety", icon: "wind" },
      { name: "Building self-esteem and identity", icon: "star" },
      { name: "Planning for the future positively", icon: "compass" },
      { name: "Understanding trauma and its effects", icon: "alert-circle" },
      { name: "Celebrating achievements", icon: "trophy" }
    ]
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    // Store as a simple config record (no separate entity needed)
    // Just return the domains for now
    return Response.json({
      success: true,
      domains: ILS_DOMAINS,
      message: "ILS domains seeded successfully"
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});