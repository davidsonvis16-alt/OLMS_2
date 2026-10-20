/** Consultancy services (services 1 to 4 of the Next Hospitality list, as the client asked). Edit this list to change the site. */
export const CONSULTANCY = [
  {
    id: "hospital-food",
    title: "Hospital food-service strategy",
    intro: "Feeding models for hospitals: therapeutic diets, ward and room service, and the workflow from kitchen to ward.",
    points: ["Service model and operating structure", "Menu and diet frameworks", "Better patient experience"],
  },
  {
    id: "kitchen-planning",
    title: "Kitchen planning & readiness",
    intro: "A review of every stage of the kitchen, from receiving to waste, so the facility is ready to open.",
    points: ["Workflow and layout reviews", "Equipment and capacity briefs", "Pre-opening and commissioning readiness"],
  },
  {
    id: "food-safety",
    title: "Food safety & accreditation",
    intro: "Food safety systems that stand up to internal reviews, certification audits and accreditation.",
    points: ["ISO 22000:2018 and HACCP", "JCI accreditation readiness", "OHS, EMS and QMS brought together"],
  },
  {
    id: "operations",
    title: "Operational improvement",
    intro: "Stronger controls for catering, cafeterias, hotels, restaurants, school feeding and multi-site operations.",
    points: ["Process redesign and SOPs", "Service flow and hospitality standards", "Performance dashboards and PDCA cycles"],
  },
] as const;

export const CONSULT_STEPS = [
  ["Talk to us", "Tell us about your business and what you need."],
  ["Visit", "We come to your premises and look at how things are done."],
  ["Improve", "We help you put things right, with your team."],
  ["Train", "Your staff are trained and can earn Aspire certificates."],
] as const;
