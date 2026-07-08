export const ILS_DOMAINS = [
  {
    id: 1,
    name: "Home Management",
    skills: [
      "Cleaning and household tasks",
      "Laundry and ironing",
      "Minor maintenance and repairs",
      "Understanding tenancy responsibilities",
      "Dealing with landlords and repairs",
      "Recycling and waste management"
    ]
  },
  {
    id: 2,
    name: "Food and Nutrition",
    skills: [
      "Meal planning for the week",
      "Food shopping on a budget",
      "Cooking 5+ different meals independently",
      "Food safety and storage",
      "Understanding nutrition and healthy eating",
      "Using kitchen equipment safely"
    ]
  },
  {
    id: 3,
    name: "Finance and Money",
    skills: [
      "Weekly/monthly budgeting",
      "Managing a bank account",
      "Paying bills and utilities",
      "Understanding credit and debt",
      "Building savings habits",
      "Claiming benefits and entitlements",
      "Understanding payslips and tax"
    ]
  },
  {
    id: 4,
    name: "Employment and Education",
    skills: [
      "Writing a CV",
      "Completing job applications",
      "Interview preparation and skills",
      "Maintaining employment",
      "Understanding workplace rights",
      "Navigating further education",
      "Career planning"
    ]
  },
  {
    id: 5,
    name: "Health Management",
    skills: [
      "Registering with and attending GP",
      "Managing medication independently",
      "Mental health self-management",
      "Sexual health awareness",
      "Dental and optical care",
      "Making and attending appointments",
      "Understanding NHS services"
    ]
  },
  {
    id: 6,
    name: "Social and Community",
    skills: [
      "Building and maintaining friendships",
      "Community engagement and activities",
      "Understanding rights as a citizen",
      "Avoiding exploitation and unhealthy relationships",
      "Using public transport",
      "Accessing local services"
    ]
  },
  {
    id: 7,
    name: "Digital Literacy",
    skills: [
      "Internet safety and privacy",
      "Setting up and using email",
      "Completing online forms",
      "Online banking safely",
      "Social media safety",
      "Job searching online",
      "Using apps for daily life"
    ]
  },
  {
    id: 8,
    name: "Emotional Wellbeing",
    skills: [
      "Identifying and managing emotions",
      "Asking for help when needed",
      "Managing stress and anxiety",
      "Building self-esteem and identity",
      "Planning for the future positively",
      "Understanding trauma and its effects",
      "Celebrating achievements"
    ]
  }
];

export function getReadinessLevel(score) {
  if (score >= 81) return { label: "Move-On Ready", color: "bg-green-100 text-green-700" };
  if (score >= 61) return { label: "Progressing Well", color: "bg-blue-100 text-blue-700" };
  if (score >= 41) return { label: "Developing", color: "bg-amber-100 text-amber-700" };
  return { label: "Early Stage", color: "bg-slate-100 text-slate-700" };
}

export function calculateDomainScore(ilsPlan, domainName) {
  if (!ilsPlan?.sections) return 0;
  const section = ilsPlan.sections.find(s => s.domain === domainName);
  if (!section?.skills) return 0;
  const achieved = section.skills.filter(s => s.status === "achieved").length;
  return Math.round((achieved / section.skills.length) * 100);
}

export function calculateOverallScore(ilsPlan) {
  if (!ilsPlan?.sections) return 0;
  const totalSkills = ilsPlan.sections.reduce((sum, s) => sum + (s.skills?.length || 0), 0);
  if (totalSkills === 0) return 0;
  const achievedSkills = ilsPlan.sections.reduce((sum, s) => 
    sum + (s.skills?.filter(sk => sk.status === "achieved").length || 0), 0
  );
  return Math.round((achievedSkills / totalSkills) * 100);
}