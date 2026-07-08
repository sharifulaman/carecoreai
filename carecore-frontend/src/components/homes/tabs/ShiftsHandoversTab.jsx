import ShiftHandoverPage from "@/components/handover/ShiftHandoverPage";

export default function ShiftsHandoversTab({ homeId, homeName, user, staffProfile }) {
  // Pass minimal home object down to the new page
  const home = { id: homeId, name: homeName };
  return <ShiftHandoverPage home={home} user={user} staffProfile={staffProfile} />;
}