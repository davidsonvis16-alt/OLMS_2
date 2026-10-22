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

/** Food safety solutions (marketed under Aspire consultancy). Edit here to change the consultancy page. */
export const FOOD_SAFETY = {
  intro: "Aspire is here to guide and train your organisation on the best food safety practices.",
  body: [
    "The reputation of a food business is heavily influenced by food safety. Good, safe procedures will ensure that you are doing everything possible to avoid a foodborne illness outbreak. Never overlook the importance of food safety; it's an investment you can't afford to overlook. The science of food safety identifies food handlers as a primary “source” of risk for any food processing establishment, despite the sanitary environment, the standardised design and the use of accurate control resources.",
    "There is a dangerous gap between knowledge of food safety handling practices and their actual application at the workplace. Throughout its experience supporting chefs, food handlers and business owners, Aspire has identified consistency and follow-up as the two main drivers for an effective implementation of food safety standards. Aspire provides food hygiene training, inspection and consulting services.",
  ],
  services: [
    {
      title: "International Food Safety Management System (FSMS) consulting",
      text: "For the fastest and most effective path to earning your international food safety management system certification, our expert consultants are here to help. We ensure you are fully prepared for your audit day.",
    },
    {
      title: "Food safety maintenance and support",
      text: "Achieving international food safety certification is just the beginning; maintaining proper practices is crucial to uphold your business standards. Aspire offers services to evaluate and maintain your Food Safety Management System, ensuring your operations remain compliant.",
    },
  ],
} as const;
