/** Aspire's own consultancy services (as already described on the Aspire site). Edit this list to change the site. */
export const CONSULTANCY = [
  {
    id: "audits",
    title: "Hygiene audits",
    intro: "Independent checks of your premises, systems and records.",
    points: ["Hygiene audits of kitchens and food premises", "Review of your records", "Findings you can act on"],
  },
  {
    id: "haccp",
    title: "HACCP support",
    intro: "HACCP plan development and support for hotels, restaurants and food premises.",
    points: ["HACCP plan development", "Support on site at your premises"],
  },
  {
    id: "pest-cleaning",
    title: "Pest control & cleaning reviews",
    intro: "Reviews of how your premises are kept clean and free of pests.",
    points: ["Pest control reviews", "Cleaning reviews"],
  },
  {
    id: "onsite",
    title: "On-site group training",
    intro: "A trainer delivers at your kitchen or hotel, scheduled around your shifts.",
    points: ["Food safety and hygiene", "Health and safety", "Scheduled around your shifts"],
  },
  {
    id: "hospitality",
    title: "Hospitality solutions",
    intro: "Standards, induction programmes and staff development for hotels, lodges, restaurants and caterers.",
    points: ["Standards", "Induction programmes", "Staff development"],
  },
  {
    id: "award",
    title: "Food Hygiene Training Standards award",
    intro: "Businesses that train with Aspire can display the Aspire award for customers and inspectors.",
    points: ["Train your team with Aspire", "Display the award at your premises"],
  },
] as const;

export const CONSULT_STEPS = [
  ["Talk to us", "Tell us about your business and what you need."],
  ["Visit", "We come to your premises and look at how things are done."],
  ["Improve", "We help you put things right, with your team."],
  ["Train", "Your staff are trained and can earn Aspire certificates."],
] as const;
